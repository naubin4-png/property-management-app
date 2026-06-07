import { PeriodStatus, TriggerType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import {
  findReminderPeriods,
  processReminderPeriods,
} from "@/lib/email-reminders";
import { getSettings } from "@/lib/settings";

function utcToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function shiftedDate(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSettings();
  if (!settings.reminderEnabled) {
    return NextResponse.json({ disabled: true, sent: 0, failed: 0, skipped: 0 });
  }

  const today = utcToday();
  const totals = { sent: 0, failed: 0, skipped: 0 };

  if (settings.sendBeforeDue) {
    const target = shiftedDate(today, settings.daysBeforeReminder);
    if (target.getUTCDate() === 1) {
      const periods = await findReminderPeriods(target, [PeriodStatus.PENDING]);
      const result = await processReminderPeriods(
        periods,
        TriggerType.RENT_REMINDER,
        {
          subject: settings.reminderEmailSubject,
          body: settings.reminderEmailBody,
        },
      );
      totals.sent += result.sent;
      totals.failed += result.failed;
      totals.skipped += result.skipped;
    }
  }

  if (settings.sendAfterDue) {
    const target = shiftedDate(today, -settings.daysAfterLateNotice);
    if (target.getUTCDate() === 1) {
      const periods = await findReminderPeriods(target, [
        PeriodStatus.PENDING,
        PeriodStatus.LATE,
      ]);
      const result = await processReminderPeriods(
        periods,
        TriggerType.LATE_NOTICE,
        {
          subject: settings.lateNoticeSubject,
          body: settings.lateNoticeBody,
        },
      );
      totals.sent += result.sent;
      totals.failed += result.failed;
      totals.skipped += result.skipped;
    }
  }

  return NextResponse.json(totals);
}
