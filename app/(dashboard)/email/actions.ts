"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  processReminderPeriods,
  unknownEmailPlaceholders,
} from "@/lib/email-reminders";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

function checked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function nonNegativeInteger(formData: FormData, name: string) {
  const value = Number.parseInt(String(formData.get(name) ?? ""), 10);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative whole number.`);
  }
  return value;
}

function requiredText(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

export async function saveEmailSettings(formData: FormData) {
  const gracePeriodDays = nonNegativeInteger(formData, "gracePeriodDays");
  const reminderEmailSubject = requiredText(formData, "reminderEmailSubject");
  const reminderEmailBody = requiredText(formData, "reminderEmailBody");
  const lateNoticeSubject = requiredText(formData, "lateNoticeSubject");
  const lateNoticeBody = requiredText(formData, "lateNoticeBody");
  const unknownPlaceholders = unknownEmailPlaceholders(
    reminderEmailSubject,
    reminderEmailBody,
    lateNoticeSubject,
    lateNoticeBody,
  );

  if (unknownPlaceholders.length > 0) {
    throw new Error(
      `Unsupported placeholder${unknownPlaceholders.length === 1 ? "" : "s"}: ${unknownPlaceholders.join(", ")}.`,
    );
  }

  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      sendBeforeDue: checked(formData, "sendBeforeDue"),
      sendAfterDue: checked(formData, "sendAfterDue"),
      daysBeforeReminder: nonNegativeInteger(formData, "daysBeforeReminder"),
      daysAfterLateNotice: gracePeriodDays,
      gracePeriodDays,
      reminderEmailSubject,
      reminderEmailBody,
      lateNoticeSubject,
      lateNoticeBody,
    },
    update: {
      sendBeforeDue: checked(formData, "sendBeforeDue"),
      sendAfterDue: checked(formData, "sendAfterDue"),
      daysBeforeReminder: nonNegativeInteger(formData, "daysBeforeReminder"),
      daysAfterLateNotice: gracePeriodDays,
      gracePeriodDays,
      reminderEmailSubject,
      reminderEmailBody,
      lateNoticeSubject,
      lateNoticeBody,
    },
  });

  revalidatePath("/");
  revalidatePath("/email");
  redirect("/email?saved=1");
}

export async function retryEmailDelivery(formData: FormData) {
  const logId = String(formData.get("logId") ?? "");
  const property = String(formData.get("property") ?? "");

  if (!logId) {
    throw new Error("Delivery log is required.");
  }

  const log = await prisma.emailLog.findUnique({
    where: { id: logId },
    select: {
      error: true,
      leaseId: true,
      periodMonth: true,
      triggerType: true,
    },
  });

  if (!log?.error || !log.leaseId || !log.periodMonth) {
    revalidatePath("/email");
    redirect(property ? `/email?property=${property}` : "/email");
  }

  const [settings, lease] = await Promise.all([
    getSettings(),
    prisma.lease.findUnique({
      where: { id: log.leaseId },
      include: {
        property: { select: { name: true } },
        tenant: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  if (!lease) {
    throw new Error("Lease for this delivery no longer exists.");
  }

  const template =
    log.triggerType === "RENT_REMINDER"
      ? {
          subject: settings.reminderEmailSubject,
          body: settings.reminderEmailBody,
        }
      : {
          subject: settings.lateNoticeSubject,
          body: settings.lateNoticeBody,
        };

  await processReminderPeriods(
    [
      {
        periodMonth: log.periodMonth,
        amountDueCents: lease.rentCents,
        lease: {
          id: lease.id,
          tenant: lease.tenant,
          property: lease.property,
        },
      },
    ],
    log.triggerType,
    template,
  );

  revalidatePath("/");
  revalidatePath("/email");
  redirect(property ? `/email?property=${property}` : "/email");
}
