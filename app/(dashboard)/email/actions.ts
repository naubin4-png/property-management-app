"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

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
  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      sendBeforeDue: checked(formData, "sendBeforeDue"),
      sendAfterDue: checked(formData, "sendAfterDue"),
      daysBeforeReminder: nonNegativeInteger(formData, "daysBeforeReminder"),
      daysAfterLateNotice: nonNegativeInteger(
        formData,
        "daysAfterLateNotice",
      ),
      gracePeriodDays: nonNegativeInteger(formData, "gracePeriodDays"),
      reminderEmailSubject: requiredText(formData, "reminderEmailSubject"),
      reminderEmailBody: requiredText(formData, "reminderEmailBody"),
      lateNoticeSubject: requiredText(formData, "lateNoticeSubject"),
      lateNoticeBody: requiredText(formData, "lateNoticeBody"),
    },
    update: {
      sendBeforeDue: checked(formData, "sendBeforeDue"),
      sendAfterDue: checked(formData, "sendAfterDue"),
      daysBeforeReminder: nonNegativeInteger(formData, "daysBeforeReminder"),
      daysAfterLateNotice: nonNegativeInteger(
        formData,
        "daysAfterLateNotice",
      ),
      gracePeriodDays: nonNegativeInteger(formData, "gracePeriodDays"),
      reminderEmailSubject: requiredText(formData, "reminderEmailSubject"),
      reminderEmailBody: requiredText(formData, "reminderEmailBody"),
      lateNoticeSubject: requiredText(formData, "lateNoticeSubject"),
      lateNoticeBody: requiredText(formData, "lateNoticeBody"),
    },
  });

  revalidatePath("/");
  revalidatePath("/email");
  redirect("/email?saved=1");
}
