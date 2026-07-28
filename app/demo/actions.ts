"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import type { PaymentActionState } from "@/app/(dashboard)/payments/actions";
import type { InlineEditState } from "@/app/(dashboard)/properties/[id]/actions";
import type { AddPropertyActionState } from "@/app/(dashboard)/properties/actions";
import { firstDayOfCurrentMonth } from "@/lib/lease-math";
import { parseDollarAmount, parseMonth } from "@/lib/lease-periods";
import { encodeDemoCreatedLease } from "@/lib/demo-data";

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

  const demoLease = encodeDemoCreatedLease({
    propertyName,
    tenantName,
    tenantEmail,
    firstPeriodMonth,
    lastPeriodMonth,
    rentCents,
  });
  const propertyId = `demo-created-${propertyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "lease"}`;
  const params = new URLSearchParams({
    demoSaved: "property",
    demoLease,
    property: propertyId,
  });
  const currentMonth = firstDayOfCurrentMonth();
  if (firstPeriodMonth.getTime() === currentMonth.getTime()) {
    params.set("leaseAdded", "1");
    params.set("propertyId", propertyId);
  }

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

  if (!propertyId || !receivedAtValue) {
    return { error: "Property, amount, and date received are required." };
  }

  if (amountCents === null) {
    return { error: "Enter a valid payment amount." };
  }

  if (!Number.isFinite(receivedAt.getTime())) {
    return { error: "Enter a valid date received." };
  }

  optionalString(formData.get("paymentMethod"));
  optionalString(formData.get("notes"));

  const href = withParam(
    withParam(
      withParam(
        withParam(safeReturnHref(formData, "/demo"), "demoSaved", "payment"),
        "paidProperty",
        propertyId,
      ),
      "paidAmount",
      String(amountCents),
    ),
    "paidAt",
    receivedAtValue,
  );

  redirect(href);
}

export async function editDemoPayment(
  _paymentId: string,
  _state: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  return logDemoPayment(_state, formData);
}

export async function deleteDemoPayment(
  _paymentId: string,
  _propertyId: string,
  returnHref: string,
) {
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

export async function saveDemoEmailSettings(formData: FormData) {
  const integerFields = [
    "daysBeforeReminder",
    "daysAfterLateNotice",
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

  redirect("/demo/email?saved=1");
}
