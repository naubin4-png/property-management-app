import {
  EmailDeliveryStatus,
  PeriodStatus,
  Prisma,
  TriggerType,
} from "@prisma/client";

import { formatMoney, formatMonth } from "@/lib/lease-math";
import { prisma } from "@/lib/prisma";
import {
  emailProviderReadiness,
  getEmailFromAddress,
  getResendClient,
} from "@/lib/resend";

export type ReminderPeriod = {
  periodMonth: Date;
  amountDueCents: number;
  lease: {
    id: string;
    tenant: { id: string; name: string; email: string | null };
    property: { name: string };
  };
};

export type EmailTemplate = {
  subject: string;
  body: string;
};

export const supportedEmailPlaceholders = [
  "{tenant_name}",
  "{property_name}",
  "{amount_due}",
  "{due_date}",
] as const;

const supportedPlaceholderSet = new Set<string>(supportedEmailPlaceholders);

export function unknownEmailPlaceholders(...templates: string[]) {
  const unknown = new Set<string>();

  for (const template of templates) {
    for (const match of template.matchAll(/\{[a-zA-Z0-9_]+\}/g)) {
      if (!supportedPlaceholderSet.has(match[0])) {
        unknown.add(match[0]);
      }
    }
  }

  return [...unknown].sort();
}

export function renderTemplate(template: string, period: ReminderPeriod) {
  return template
    .replaceAll("{tenant_name}", period.lease.tenant.name)
    .replaceAll("{property_name}", period.lease.property.name)
    .replaceAll("{amount_due}", `$${formatMoney(period.amountDueCents)}`)
    .replaceAll("{due_date}", formatMonth(period.periodMonth));
}

export function shiftedUtcDate(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function firstOfMonthOrNull(date: Date) {
  return date.getUTCDate() === 1 ? date : null;
}

export function reminderPeriodForToday(today: Date, daysBeforeReminder: number) {
  return firstOfMonthOrNull(shiftedUtcDate(today, daysBeforeReminder));
}

export function lateNoticePeriodForToday(today: Date, gracePeriodDays: number) {
  return firstOfMonthOrNull(shiftedUtcDate(today, -gracePeriodDays));
}

type ExistingEmailLog = {
  id: string;
  status: EmailDeliveryStatus;
};

type ReminderProcessingDeps = {
  createProcessingLog: (input: {
    workspaceId: string;
    leaseId: string;
    periodMonth: Date;
    subject: string;
    tenantId: string;
    toAddress: string;
    triggerType: TriggerType;
  }) => Promise<ExistingEmailLog>;
  findExistingLog: (input: {
    workspaceId: string;
    periodMonth: Date;
    tenantId: string;
    triggerType: TriggerType;
  }) => Promise<ExistingEmailLog | null>;
  markFailed: (id: string, error: string) => Promise<void>;
  markAccepted: (id: string, resendMessageId?: string) => Promise<void>;
  claimFailedLog: (id: string) => Promise<boolean>;
  sendEmail: (input: {
    body: string;
    idempotencyKey: string;
    replyToEmail: string;
    subject: string;
    toAddress: string;
  }) => Promise<{ id?: string }>;
};

const defaultReminderProcessingDeps: ReminderProcessingDeps = {
  async createProcessingLog(input) {
    return prisma.emailLog.create({
      data: {
        workspaceId: input.workspaceId,
        tenantId: input.tenantId,
        leaseId: input.leaseId,
        periodMonth: input.periodMonth,
        toAddress: input.toAddress,
        subject: input.subject,
        triggerType: input.triggerType,
        status: EmailDeliveryStatus.PROCESSING,
      },
      select: { id: true, status: true },
    });
  },
  async findExistingLog(input) {
    return prisma.emailLog.findUnique({
      where: {
        workspaceId_tenantId_triggerType_periodMonth: {
          workspaceId: input.workspaceId,
          tenantId: input.tenantId,
          triggerType: input.triggerType,
          periodMonth: input.periodMonth,
        },
      },
      select: { id: true, status: true },
    });
  },
  async markFailed(id, error) {
    await prisma.emailLog.update({
      where: { id },
      data: { error, status: EmailDeliveryStatus.FAILED },
    });
  },
  async markAccepted(id, resendMessageId) {
    await prisma.emailLog.update({
      where: { id },
      data: {
        resendMessageId,
        error: null,
        status: EmailDeliveryStatus.ACCEPTED,
      },
    });
  },
  async claimFailedLog(id) {
    const result = await prisma.emailLog.updateMany({
      where: {
        id,
        status: EmailDeliveryStatus.FAILED,
      },
      data: { error: null, status: EmailDeliveryStatus.PROCESSING },
    });

    return result.count === 1;
  },
  async sendEmail(input) {
    const result = await getResendClient().emails.send({
      from: getEmailFromAddress(),
      to: input.toAddress,
      subject: input.subject,
      text: input.body,
      replyTo: input.replyToEmail,
    }, {
      idempotencyKey: input.idempotencyKey,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return { id: result.data?.id };
  },
};

export async function processReminderPeriods(
  periods: ReminderPeriod[],
  triggerType: TriggerType,
  template: EmailTemplate,
  deps = defaultReminderProcessingDeps,
  workspaceId = "test-workspace",
  replyToEmail = "owner@example.com",
) {
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const period of periods) {
    const subject = renderTemplate(template.subject, period);
    const body = renderTemplate(template.body, period);
    const tenant = period.lease.tenant;

    if (!tenant.email) {
      skipped += 1;
      continue;
    }

    let log: ExistingEmailLog;
    try {
      const existingLog = await deps.findExistingLog({
        workspaceId,
        tenantId: tenant.id,
        triggerType,
        periodMonth: period.periodMonth,
      });

      if (existingLog) {
        if (existingLog.status !== EmailDeliveryStatus.FAILED) {
          skipped += 1;
          continue;
        }

        const claimed = await deps.claimFailedLog(existingLog.id);
        if (!claimed) {
          skipped += 1;
          continue;
        }
        log = existingLog;
      } else {
        log = await deps.createProcessingLog({
          workspaceId,
          tenantId: tenant.id,
          leaseId: period.lease.id,
          periodMonth: period.periodMonth,
          toAddress: tenant.email,
          subject,
          triggerType,
        });
      }

      try {
        const result = await deps.sendEmail({
          toAddress: tenant.email,
          subject,
          body,
          idempotencyKey: log.id,
          replyToEmail,
        });
        await deps.markAccepted(log.id, result.id);
        sent += 1;
      } catch (error) {
        await deps.markFailed(
          log.id,
          error instanceof Error ? error.message : "Email send failed.",
        );
        failed += 1;
      }
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
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

export function canSendWorkspaceEmail(emailEnabled: boolean) {
  return emailEnabled && emailProviderReadiness().configured;
}

export async function findReminderPeriods(
  periodMonth: Date,
  statuses: PeriodStatus[],
  workspaceId: string,
) {
  const currentMonth = new Date(
    Date.UTC(periodMonth.getUTCFullYear(), periodMonth.getUTCMonth(), 1),
  );

  return prisma.paymentPeriod.findMany({
    where: {
      workspaceId,
      periodMonth,
      status: { in: statuses },
      lease: {
        firstPeriodMonth: { lte: currentMonth },
        OR: [
          { lastPeriodMonth: null },
          { lastPeriodMonth: { gte: currentMonth } },
        ],
      },
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
