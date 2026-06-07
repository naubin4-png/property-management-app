import { prisma } from "@/lib/prisma";

export const defaultEmailSettings = {
  reminderEnabled: true,
  sendBeforeDue: true,
  sendAfterDue: true,
  daysBeforeReminder: 3,
  daysAfterLateNotice: 5,
  gracePeriodDays: 5,
  reminderEmailSubject: "Rent reminder for {property_name}",
  reminderEmailBody:
    "Hi {tenant_name},\n\nThis is a friendly reminder that rent of {amount_due} for {property_name} is due on {due_date}.\n\nThanks!",
  lateNoticeSubject: "Rent past due for {property_name}",
  lateNoticeBody:
    "Hi {tenant_name},\n\nOur records show that rent of {amount_due} for {property_name} was due on {due_date} and has not yet been received. Please let me know the status.\n\nThanks!",
};

export async function getSettings() {
  return prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      ...defaultEmailSettings,
    },
  });
}
