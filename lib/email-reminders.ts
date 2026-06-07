import { PeriodStatus, TriggerType } from "@prisma/client";

import { formatMoney, formatMonth } from "@/lib/lease-math";
import { prisma } from "@/lib/prisma";
import { getEmailFromAddress, getResendClient } from "@/lib/resend";

type ReminderPeriod = {
  periodMonth: Date;
  amountDueCents: number;
  lease: {
    id: string;
    tenant: { id: string; name: string; email: string };
    property: { name: string };
  };
};

type EmailTemplate = {
  subject: string;
  body: string;
};

function renderTemplate(template: string, period: ReminderPeriod) {
  return template
    .replaceAll("{tenant_name}", period.lease.tenant.name)
    .replaceAll("{property_name}", period.lease.property.name)
    .replaceAll("{amount_due}", `$${formatMoney(period.amountDueCents)}`)
    .replaceAll("{due_date}", formatMonth(period.periodMonth));
}

export async function processReminderPeriods(
  periods: ReminderPeriod[],
  triggerType: TriggerType,
  template: EmailTemplate,
) {
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const period of periods) {
    const subject = renderTemplate(template.subject, period);
    const body = renderTemplate(template.body, period);
    const tenant = period.lease.tenant;

    try {
      const log = await prisma.emailLog.create({
        data: {
          tenantId: tenant.id,
          leaseId: period.lease.id,
          periodMonth: period.periodMonth,
          toAddress: tenant.email,
          subject,
          triggerType,
          error: "Processing",
        },
      });

      try {
        const result = await getResendClient().emails.send({
          from: getEmailFromAddress(),
          to: tenant.email,
          subject,
          text: body,
        });

        if (result.error) {
          throw new Error(result.error.message);
        }

        await prisma.emailLog.update({
          where: { id: log.id },
          data: {
            resendMessageId: result.data?.id,
            error: null,
          },
        });
        sent += 1;
      } catch (error) {
        await prisma.emailLog.update({
          where: { id: log.id },
          data: {
            error: error instanceof Error ? error.message : "Email send failed.",
          },
        });
        failed += 1;
      }
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        skipped += 1;
        continue;
      }
      throw error;
    }
  }

  return { sent, failed, skipped };
}

export async function findReminderPeriods(
  periodMonth: Date,
  statuses: PeriodStatus[],
) {
  const currentMonth = new Date(
    Date.UTC(periodMonth.getUTCFullYear(), periodMonth.getUTCMonth(), 1),
  );

  return prisma.paymentPeriod.findMany({
    where: {
      periodMonth,
      status: { in: statuses },
      lease: { lastPeriodMonth: { gte: currentMonth } },
    },
    include: {
      lease: {
        include: {
          tenant: true,
          property: true,
        },
      },
    },
  });
}
