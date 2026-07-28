import { PeriodStatus, TriggerType } from "@prisma/client";

import { firstDayOfCurrentMonth, firstDayOfNextMonth } from "@/lib/lease-math";

type LedgerPeriod = {
  id: string;
  periodMonth: Date;
  amountDueCents: number;
  status: PeriodStatus;
  paymentId: string | null;
};

type LedgerPayment = {
  id: string;
  receivedAt: Date;
  amountCents: number;
  paymentMethod: string | null;
  notes: string | null;
};

type LedgerEmailLog = {
  triggerType: TriggerType;
  sentAt: Date;
  error: string | null;
};

export type CurrentRentSummary = {
  billingMonth: Date;
  badge: "PAID" | "UNPAID";
  amountRemainingCents: number;
  supportingText: string;
  successfulEmailActivity: {
    label: string;
    sentAt: Date;
  } | null;
};

export type RentLedgerRow =
  | {
      id: string;
      kind: "charge";
      date: Date;
      activity: string;
      amountCents: number;
      context: string;
      status: "Paid" | "Unpaid" | "Late" | "Upcoming";
    }
  | {
      id: string;
      kind: "payment";
      date: Date;
      activity: string;
      amountCents: number;
      context: string;
      paymentMethod: string | null;
      paymentMemo: string | null;
      paymentId: string;
    };

export function rentBadgeForPeriod(
  period: LedgerPeriod | null,
  creditAppliedCents: number,
) {
  if (!period) {
    return "PAID" as const;
  }

  return period.status === PeriodStatus.RECEIVED ||
    period.amountDueCents - creditAppliedCents <= 0
    ? "PAID"
    : "UNPAID";
}

export function deriveCreditBalance({
  payments,
  periods,
}: {
  payments: LedgerPayment[];
  periods: LedgerPeriod[];
}) {
  const paidCents = payments.reduce(
    (total, payment) => total + payment.amountCents,
    0,
  );
  const allocatedCents = periods
    .filter((period) => period.status === PeriodStatus.RECEIVED)
    .reduce((total, period) => total + period.amountDueCents, 0);

  return paidCents - allocatedCents;
}

export function derivePeriodBalances({
  creditBalanceCents,
  periods,
}: {
  creditBalanceCents: number;
  periods: LedgerPeriod[];
}) {
  let availableCredit = Math.max(creditBalanceCents, 0);
  const balances = new Map<
    string,
    { creditAppliedCents: number; remainingCents: number }
  >();

  for (const period of [...periods].sort(
    (a, b) => a.periodMonth.getTime() - b.periodMonth.getTime(),
  )) {
    if (period.status === PeriodStatus.RECEIVED) {
      balances.set(period.id, {
        creditAppliedCents: 0,
        remainingCents: 0,
      });
      continue;
    }

    const creditAppliedCents = Math.min(
      availableCredit,
      period.amountDueCents,
    );
    availableCredit -= creditAppliedCents;
    balances.set(period.id, {
      creditAppliedCents,
      remainingCents: Math.max(period.amountDueCents - creditAppliedCents, 0),
    });
  }

  return balances;
}

export function formatShortMonth(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function chargeStatus(period: LedgerPeriod, today: Date) {
  if (period.status === PeriodStatus.RECEIVED) {
    return "Paid" as const;
  }
  if (period.status === PeriodStatus.LATE) {
    return "Late" as const;
  }
  if (period.periodMonth > today) {
    return "Upcoming" as const;
  }
  return "Unpaid" as const;
}

function coveredPeriodContext(payment: LedgerPayment, periods: LedgerPeriod[]) {
  const coveredPeriods = periods
    .filter(
      (period) =>
        period.status === PeriodStatus.RECEIVED &&
        period.paymentId === payment.id,
    )
    .sort((a, b) => a.periodMonth.getTime() - b.periodMonth.getTime());

  if (coveredPeriods.length === 0) {
    return "Unallocated credit";
  }

  if (coveredPeriods.length === 1) {
    return `Covers ${formatShortMonth(coveredPeriods[0].periodMonth)} rent`;
  }

  return `Covers ${formatShortMonth(coveredPeriods[0].periodMonth)} through ${formatShortMonth(coveredPeriods.at(-1)!.periodMonth)}`;
}

export function deriveCurrentRentSummary({
  creditBalanceCents,
  emailLogs,
  periods,
}: {
  creditBalanceCents: number;
  emailLogs: LedgerEmailLog[];
  periods: LedgerPeriod[];
}): CurrentRentSummary | null {
  const billingMonth = firstDayOfCurrentMonth();
  const billingPeriod =
    periods.find(
      (period) => period.periodMonth.getTime() === billingMonth.getTime(),
    ) ?? null;

  if (!billingPeriod) {
    return null;
  }

  const balances = derivePeriodBalances({
    creditBalanceCents,
    periods,
  });
  const balance = balances.get(billingPeriod.id) ?? {
    creditAppliedCents: 0,
    remainingCents:
      billingPeriod.status === PeriodStatus.RECEIVED
        ? 0
        : billingPeriod.amountDueCents,
  };
  const badge = rentBadgeForPeriod(billingPeriod, balance.creditAppliedCents);
  const successfulEmail =
    emailLogs
      .filter((log) => !log.error)
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())[0] ?? null;

  return {
    billingMonth,
    badge,
    amountRemainingCents: balance.remainingCents,
    supportingText:
      badge === "PAID"
        ? "This month is paid."
        : billingPeriod.status === PeriodStatus.LATE
          ? `Unpaid since ${formatShortDate(billingPeriod.periodMonth)}.`
          : `Due ${formatShortDate(billingPeriod.periodMonth)}.`,
    successfulEmailActivity: successfulEmail
      ? {
          label:
            successfulEmail.triggerType === TriggerType.RENT_REMINDER
              ? "Reminder sent"
              : "Late notice sent",
          sentAt: successfulEmail.sentAt,
        }
      : null,
  };
}

export function deriveRentLedger({
  creditBalanceCents,
  includeFutureThrough = firstDayOfNextMonth(),
  payments,
  periods,
  today = new Date(),
}: {
  creditBalanceCents: number;
  includeFutureThrough?: Date;
  payments: LedgerPayment[];
  periods: LedgerPeriod[];
  today?: Date;
}) {
  const balances = derivePeriodBalances({ creditBalanceCents, periods });
  const chargeRows: RentLedgerRow[] = periods
    .filter(
      (period) =>
        period.periodMonth <= includeFutureThrough ||
        period.status === PeriodStatus.RECEIVED ||
        Boolean(period.paymentId),
    )
    .map((period) => {
      const balance = balances.get(period.id) ?? {
        creditAppliedCents: 0,
        remainingCents:
          period.status === PeriodStatus.RECEIVED ? 0 : period.amountDueCents,
      };
      const status = chargeStatus(period, today);
      const context =
        status === "Paid"
          ? "Satisfied"
          : balance.creditAppliedCents > 0
            ? `$${(balance.remainingCents / 100).toFixed(2)} remaining after credit`
            : status === "Upcoming"
              ? "Upcoming rent period"
              : `$${(balance.remainingCents / 100).toFixed(2)} remaining`;

      return {
        id: `charge:${period.id}`,
        kind: "charge",
        date: period.periodMonth,
        activity: `${formatShortMonth(period.periodMonth)} rent`,
        amountCents: period.amountDueCents,
        context,
        status,
      };
    });
  const paymentRows: RentLedgerRow[] = payments.map((payment) => ({
    id: `payment:${payment.id}`,
    kind: "payment",
    date: payment.receivedAt,
    activity: "Payment received",
    amountCents: payment.amountCents,
    context: coveredPeriodContext(payment, periods),
    paymentMethod: payment.paymentMethod,
    paymentMemo: payment.notes,
    paymentId: payment.id,
  }));

  return [...chargeRows, ...paymentRows].sort((a, b) => {
    const dateSort = b.date.getTime() - a.date.getTime();
    if (dateSort !== 0) {
      return dateSort;
    }
    if (a.kind === b.kind) {
      return a.id.localeCompare(b.id);
    }
    return a.kind === "payment" ? -1 : 1;
  });
}
