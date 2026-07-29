import { PeriodStatus, TriggerType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import {
  findReminderPeriods,
  processReminderPeriods,
} from "@/lib/email-reminders";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

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

  const today = utcToday();
  const totals = { sent: 0, failed: 0, skipped: 0 };
  const workspaces = await prisma.workspace.findMany({
    select: { id: true },
  });

  for (const workspace of workspaces) {
    const settings = await getSettings(workspace.id);
    if (settings.sendBeforeDue) {
      const target = shiftedDate(today, settings.daysBeforeReminder);
      if (target.getUTCDate() === 1) {
        const periods = await findReminderPeriods(
          target,
          [PeriodStatus.PENDING],
          workspace.id,
        );
        const result = await processReminderPeriods(
          periods,
          TriggerType.RENT_REMINDER,
          {
            subject: settings.reminderEmailSubject,
            body: settings.reminderEmailBody,
          },
          undefined,
          workspace.id,
        );
        totals.sent += result.sent;
        totals.failed += result.failed;
        totals.skipped += result.skipped;
      }
    }

    if (settings.sendAfterDue) {
      const target = shiftedDate(today, -settings.gracePeriodDays);
      if (target.getUTCDate() === 1) {
        const periods = await findReminderPeriods(
          target,
          [PeriodStatus.PENDING, PeriodStatus.LATE],
          workspace.id,
        );
        const result = await processReminderPeriods(
          periods,
          TriggerType.LATE_NOTICE,
          {
            subject: settings.lateNoticeSubject,
            body: settings.lateNoticeBody,
          },
          undefined,
          workspace.id,
        );
        totals.sent += result.sent;
        totals.failed += result.failed;
        totals.skipped += result.skipped;
      }
    }
  }

  return NextResponse.json({ ...totals, workspaces: workspaces.length });
}
