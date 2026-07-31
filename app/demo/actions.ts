"use server";

import { randomUUID } from "node:crypto";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import type { PaymentActionState } from "@/app/(dashboard)/payments/actions";
import type { InlineEditState } from "@/app/(dashboard)/properties/[id]/actions";
import type { AddPropertyActionState } from "@/app/(dashboard)/properties/actions";
import { firstDayOfCurrentMonth } from "@/lib/lease-math";
import { parseDollarAmount, parseMonth } from "@/lib/lease-periods";
import {
  buildDemoCreatedLeaseRedirectParams,
  encodeDemoCreatedLease,
  parseDemoSessionState,
  type DemoSessionState,
} from "@/lib/demo-data";
import { unknownEmailPlaceholders } from "@/lib/email-reminders";

function safeReturnHref(formData: FormData, fallback: string) {
  const value = String(formData.get("returnHref") ?? "");
  return safeDemoHref(value, fallback);
}

function safeDemoHref(value: string, fallback: string) {
  if (
    value === "/demo" ||
    value.startsWith("/demo?") ||
    value.startsWith("/demo/")
  ) {
    return value;
  }

  return fallback;
}

function withParam(href: string, key: string, value: string) {
  const [pathname, search = ""] = href.split("?");
  const params = new URLSearchParams(search);
  params.set(key, value);
  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}

function safeDemoHrefFromReferer(value: string | null) {
  if (!value) {
    return "/demo";
  }

  try {
    const url = new URL(value);
    return safeDemoHref(`${url.pathname}${url.search}`, "/demo");
  } catch {
    return safeDemoHref(value, "/demo");
  }
}

function optionalString(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function serializeDemoSession(session: DemoSessionState) {
  return JSON.stringify(session);
}

async function readDemoSession() {
  const cookieStore = await cookies();
  return {
    cookieStore,
    session: parseDemoSessionState(
      cookieStore.get("demo-detail-session")?.value,
    ),
  };
}

function writeDemoSession(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  session: DemoSessionState,
) {
  cookieStore.set("demo-detail-session", serializeDemoSession(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/demo",
  });
}

export async function createDemoPropertyWithLease(
  _state: AddPropertyActionState,
  formData: FormData,
): Promise<AddPropertyActionState> {
  const propertyName = String(formData.get("propertyName") ?? "").trim();
  const tenantName = String(formData.get("tenantName") ?? "").trim();
  const tenantEmail =
    String(formData.get("tenantEmail") ?? "").trim().toLowerCase() || null;
  const firstPeriodMonth = parseMonth(
    String(formData.get("firstPeriodMonth") ?? ""),
  );
  const rawLastPeriodMonth = String(formData.get("lastPeriodMonth") ?? "");
  const lastPeriodMonth = rawLastPeriodMonth
    ? parseMonth(rawLastPeriodMonth)
    : null;
  const rentCents = parseDollarAmount(String(formData.get("rent") ?? ""));

  if (
    !propertyName ||
    !tenantName ||
    !firstPeriodMonth ||
    !rentCents
  ) {
    return { error: "Complete all required fields." };
  }

  if (tenantEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantEmail)) {
    return { error: "Enter a valid tenant email." };
  }

  if (rawLastPeriodMonth && !lastPeriodMonth) {
    return { error: "Choose a valid lease end month." };
  }

  if (lastPeriodMonth && lastPeriodMonth < firstPeriodMonth) {
    return {
      error: "Lease end must be the same as or after the first rent month.",
    };
  }

  const propertyId = `demo-created-${randomUUID()}`;
  const demoLease = encodeDemoCreatedLease({
    id: propertyId,
    propertyName,
    tenantName,
    tenantEmail,
    firstPeriodMonth,
    lastPeriodMonth,
    rentCents,
  });
  const { cookieStore, session } = await readDemoSession();
  session.createdLease = demoLease;
  session.createdLeases = [...session.createdLeases, demoLease];
  writeDemoSession(cookieStore, session);
  const currentMonth = firstDayOfCurrentMonth();
  const params = buildDemoCreatedLeaseRedirectParams({
    currentMonth,
    firstPeriodMonth,
    propertyId,
  });

  redirect(`/demo?${params.toString()}`);
}

export async function logDemoPayment(
  _state: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  const amountCents = parseDollarAmount(String(formData.get("amount") ?? ""));
  const receivedAtValue = String(formData.get("receivedAt") ?? "");
  const receivedAt = new Date(`${receivedAtValue}T00:00:00.000Z`);
  const paymentMethod = optionalString(formData.get("paymentMethod"));
  const notes = optionalString(formData.get("notes"));
  const clientRequestId =
    String(formData.get("clientRequestId") ?? "").trim() ||
    `demo-payment-${Date.now()}`;
  const createNewLease = formData.get("createNewLease") === "1";

  if ((!createNewLease && !propertyId) || !receivedAtValue) {
    return { error: "Lease, amount, and date received are required." };
  }

  if (amountCents === null) {
    return { error: "Enter a valid payment amount." };
  }

  if (!Number.isFinite(receivedAt.getTime())) {
    return { error: "Enter a valid date received." };
  }

  const { cookieStore, session } = await readDemoSession();
  const existingPayment = session.payments.find(
    (payment) => payment.id === clientRequestId,
  );
  let resolvedPropertyId = existingPayment?.propertyId ?? propertyId;

  if (createNewLease && !existingPayment) {
    const propertyName = String(formData.get("propertyName") ?? "").trim();
    const tenantName = String(formData.get("tenantName") ?? "").trim();
    const rentCents = parseDollarAmount(
      String(formData.get("monthlyRent") ?? ""),
    );
    const firstPeriodMonth = parseMonth(
      String(formData.get("firstPeriodMonth") ?? ""),
    );

    if (!propertyName || !tenantName || !rentCents || !firstPeriodMonth) {
      return {
        error: "Property, tenant, monthly rent, and rent month are required.",
      };
    }

    resolvedPropertyId = `demo-created-${clientRequestId}`;
    const encodedLease = encodeDemoCreatedLease({
      id: resolvedPropertyId,
      propertyName,
      tenantName,
      tenantEmail: null,
      firstPeriodMonth,
      lastPeriodMonth: null,
      rentCents,
    });
    session.createdLease = encodedLease;
    session.createdLeases = [...session.createdLeases, encodedLease];
  }

  session.deletedPaymentIds = session.deletedPaymentIds.filter(
    (id) => id !== clientRequestId,
  );
  if (!existingPayment) {
    session.payments = [
      ...session.payments,
      {
        id: clientRequestId,
        amountCents,
        notes,
        paymentMethod,
        propertyId: resolvedPropertyId,
        receivedAt: receivedAtValue,
      },
    ];
  }
  writeDemoSession(cookieStore, session);

  const href = withParam(safeReturnHref(formData, "/demo"), "demoSaved", "payment");

  redirect(href);
}

export async function editDemoPayment(
  paymentId: string,
  _state: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const nextFormData = new FormData();
  for (const [key, value] of formData.entries()) {
    nextFormData.append(key, value);
  }
  nextFormData.set("clientRequestId", paymentId);
  return logDemoPayment(_state, nextFormData);
}

export async function deleteDemoPayment(
  paymentId: string,
  _propertyId: string,
  returnHref: string,
) {
  const { cookieStore, session } = await readDemoSession();
  session.deletedPaymentIds = [...new Set([...session.deletedPaymentIds, paymentId])];
  session.payments = session.payments.filter((payment) => payment.id !== paymentId);
  writeDemoSession(cookieStore, session);
  redirect(
    withParam(safeDemoHref(returnHref, "/demo"), "demoSaved", "deleted-payment"),
  );
}

export async function updateDemoTenant(
  _propertyId: string,
  _tenantId: string,
  _state: InlineEditState,
  formData: FormData,
): Promise<InlineEditState> {
  const name = String(formData.get("tenantName") ?? "").trim();
  const email =
    String(formData.get("tenantEmail") ?? "").trim().toLowerCase() || null;

  if (!name) {
    return { error: "Tenant name is required.", saved: false };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid tenant email.", saved: false };
  }

  return { error: null, saved: true };
}

export async function updateDemoLeaseInline(
  propertyId: string,
  _leaseId: string,
  _state: InlineEditState,
  formData: FormData,
): Promise<InlineEditState> {
  const rawLastPeriodMonth = String(formData.get("lastPeriodMonth") ?? "");
  const lastPeriodMonth = rawLastPeriodMonth
    ? parseMonth(rawLastPeriodMonth)
    : null;
  const rentCents = parseDollarAmount(String(formData.get("rent") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim();

  if (rawLastPeriodMonth && !lastPeriodMonth) {
    return { error: "Choose a valid lease end month.", saved: false };
  }
  if (!rentCents) {
    return { error: "Enter a valid monthly rent.", saved: false };
  }
  if (notes.length > 1000) {
    return { error: "Use 1,000 characters or fewer for notes.", saved: false };
  }

  const requestHeaders = await headers();
  const returnUrl = new URL(
    safeDemoHrefFromReferer(requestHeaders.get("referer")),
    "http://demo.local",
  );
  returnUrl.searchParams.set("noteProperty", propertyId);
  returnUrl.searchParams.set("note", notes);

  redirect(`${returnUrl.pathname}?${returnUrl.searchParams.toString()}`);
}

export async function updateDemoLeaseNote(
  propertyId: string,
  _leaseId: string,
  _state: InlineEditState,
  formData: FormData,
): Promise<InlineEditState> {
  const notes = String(formData.get("notes") ?? "").trim();
  if (notes.length > 1000) {
    return { error: "Use 1,000 characters or fewer for notes.", saved: false };
  }

  const { cookieStore, session } = await readDemoSession();
  const existing = session.detailEdits[propertyId];
  session.detailEdits[propertyId] = {
    ...existing,
    note: notes,
  };
  writeDemoSession(cookieStore, session);
  return { error: null, saved: true };
}

export async function updateDemoPropertyDetails(
  propertyId: string,
  _leaseId: string,
  _state: InlineEditState,
  formData: FormData,
): Promise<InlineEditState> {
  const propertyName = String(formData.get("propertyName") ?? "").trim();
  const tenantName = String(formData.get("tenantName") ?? "").trim();
  const tenantEmail =
    String(formData.get("tenantEmail") ?? "").trim().toLowerCase() || null;
  const rawLastPeriodMonth = String(formData.get("lastPeriodMonth") ?? "");
  const lastPeriodMonth = rawLastPeriodMonth
    ? parseMonth(rawLastPeriodMonth)
    : null;
  const rentCents = parseDollarAmount(String(formData.get("rent") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim();

  if (!propertyName || !tenantName) {
    return { error: "Property and tenant names are required.", saved: false };
  }
  if (tenantEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantEmail)) {
    return { error: "Enter a valid tenant email.", saved: false };
  }
  if (rawLastPeriodMonth && !lastPeriodMonth) {
    return { error: "Choose a valid lease end month.", saved: false };
  }
  if (!rentCents) {
    return { error: "Enter a valid monthly rent.", saved: false };
  }
  if (notes.length > 1000) {
    return { error: "Use 1,000 characters or fewer for notes.", saved: false };
  }

  const { cookieStore, session } = await readDemoSession();
  session.detailEdits[propertyId] = {
    lastPeriodMonth: rawLastPeriodMonth || null,
    note: notes,
    propertyName,
    rentCents,
    tenantEmail,
    tenantName,
  };
  writeDemoSession(cookieStore, session);

  return { error: null, saved: true };
}

export async function saveDemoEmailSettings(formData: FormData) {
  const integerFields = [
    "daysBeforeReminder",
    "gracePeriodDays",
  ];
  const textFields = [
    "reminderEmailSubject",
    "reminderEmailBody",
    "lateNoticeSubject",
    "lateNoticeBody",
  ];

  for (const field of integerFields) {
    const value = Number.parseInt(String(formData.get(field) ?? ""), 10);
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`${field} must be a non-negative whole number.`);
    }
  }

  for (const field of textFields) {
    if (!String(formData.get(field) ?? "").trim()) {
      throw new Error(`${field} is required.`);
    }
  }

  const settings = {
    sendBeforeDue: formData.get("sendBeforeDue") === "on",
    sendAfterDue: formData.get("sendAfterDue") === "on",
    daysBeforeReminder: Number.parseInt(
      String(formData.get("daysBeforeReminder") ?? ""),
      10,
    ),
    gracePeriodDays: Number.parseInt(
      String(formData.get("gracePeriodDays") ?? ""),
      10,
    ),
    reminderEmailSubject: String(formData.get("reminderEmailSubject") ?? "").trim(),
    reminderEmailBody: String(formData.get("reminderEmailBody") ?? "").trim(),
    lateNoticeSubject: String(formData.get("lateNoticeSubject") ?? "").trim(),
    lateNoticeBody: String(formData.get("lateNoticeBody") ?? "").trim(),
  };
  const unknownPlaceholders = unknownEmailPlaceholders(
    settings.reminderEmailSubject,
    settings.reminderEmailBody,
    settings.lateNoticeSubject,
    settings.lateNoticeBody,
  );

  if (unknownPlaceholders.length > 0) {
    throw new Error(
      `Unsupported placeholder${unknownPlaceholders.length === 1 ? "" : "s"}: ${unknownPlaceholders.join(", ")}.`,
    );
  }

  const cookieStore = await cookies();
  cookieStore.set("demo-reminder-settings", JSON.stringify(settings), {
    httpOnly: true,
    sameSite: "lax",
    path: "/demo/email",
  });

  redirect("/demo/email?saved=1");
}

export async function retryDemoEmailDelivery(formData: FormData) {
  const logId = String(formData.get("logId") ?? "");
  const property = String(formData.get("property") ?? "");

  if (!logId) {
    throw new Error("Delivery log is required.");
  }

  const cookieStore = await cookies();
  const currentValue = cookieStore.get("demo-retried-email-logs")?.value;
  let retriedLogIds: string[] = [];
  try {
    const parsed = currentValue ? JSON.parse(currentValue) : [];
    retriedLogIds = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    retriedLogIds = [];
  }
  const nextLogIds = [...new Set([...retriedLogIds, logId])];

  cookieStore.set("demo-retried-email-logs", JSON.stringify(nextLogIds), {
    httpOnly: true,
    sameSite: "lax",
    path: "/demo/email",
  });

  redirect(property ? `/demo/email?property=${property}` : "/demo/email");
}
