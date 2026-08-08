import { PeriodStatus, TriggerType } from "@prisma/client";

import { firstDayOfCurrentMonth } from "@/lib/lease-math";

type LedgerPeriod = {
  id: string;
  periodMonth: Date;
  amountDueCents: number;
  status: PeriodStatus;
  paymentId: string | null;
};

type LedgerPayment = {
  id: string;
  createdAt?: Date;
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
  paidAt: Date | null;
  successfulEmailActivity: {
    label: string;
    sentAt: Date;
  } | null;
};

export type RentLedgerRow = {
  id: string;
  kind: "month";
  date: Date;
  activity: string;
  amountCents: number;
  context: string;
  status: "Paid" | "Partially paid" | "Unpaid";
  payments: {
    id: string;
    appliedCents: number;
    transactionAmountCents: number;
    paymentMethod: string | null;
    receivedAt: Date;
  }[];
};

function derivePaymentApplications({
  payments,
  periods,
}: {
  payments: LedgerPayment[];
  periods: LedgerPeriod[];
}) {
  const applications = new Map<
    string,
    { appliedCents: number; payment: LedgerPayment }[]
  >();
  const sortedPeriods = [...periods].sort(
    (a, b) => a.periodMonth.getTime() - b.periodMonth.getTime(),
  );
  const sortedPayments = [...payments].sort(
    (a, b) =>
      a.receivedAt.getTime() - b.receivedAt.getTime() ||
      (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0) ||
      a.id.localeCompare(b.id),
  );
  const remainingByPeriod = new Map(
    sortedPeriods.map((period) => [period.id, period.amountDueCents]),
  );

  for (const payment of sortedPayments) {
    let unappliedCents = payment.amountCents;
    const recordedPeriods = sortedPeriods.filter(
      (period) =>
        period.status === PeriodStatus.RECEIVED &&
        period.paymentId === payment.id,
    );

    // A received period records the payment that completed it. Honor those
    // anchors before applying the payment's residual to older open balances.
    // Earlier payments have already contributed any partial credit they supplied.
    for (const period of [...recordedPeriods, ...sortedPeriods]) {
      const remainingCents = remainingByPeriod.get(period.id) ?? 0;
      if (remainingCents <= 0 || unappliedCents <= 0) {
        continue;
      }

      const appliedCents = Math.min(remainingCents, unappliedCents);
      remainingByPeriod.set(period.id, remainingCents - appliedCents);
      unappliedCents -= appliedCents;
      applications.set(period.id, [
        ...(applications.get(period.id) ?? []),
        { appliedCents, payment },
      ]);
    }
  }

  return applications;
}

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
  payments = [],
  periods,
}: {
  payments?: LedgerPayment[];
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

export function expectedPaymentAmount({
  creditBalanceCents,
  nextDueAmountCents,
  rentCents,
}: {
  creditBalanceCents: number;
  nextDueAmountCents: number | null;
  rentCents: number;
}) {
  if (nextDueAmountCents === null) {
    return rentCents;
  }

  const remainingCents = Math.max(
    nextDueAmountCents -
      Math.min(Math.max(creditBalanceCents, 0), nextDueAmountCents),
    0,
  );
  return remainingCents || rentCents;
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

export function deriveCurrentRentSummary({
  billingMonth = firstDayOfCurrentMonth(),
  creditBalanceCents,
  emailLogs,
  payments = [],
  periods,
}: {
  billingMonth?: Date;
  creditBalanceCents: number;
  emailLogs: LedgerEmailLog[];
  payments?: LedgerPayment[];
  periods: LedgerPeriod[];
}): CurrentRentSummary | null {
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
  const paidAt =
    billingPeriod.paymentId && billingPeriod.status === PeriodStatus.RECEIVED
      ? (payments.find((payment) => payment.id === billingPeriod.paymentId)
          ?.receivedAt ?? null)
      : null;

  return {
    billingMonth,
    badge,
    amountRemainingCents: balance.remainingCents,
    paidAt,
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
  payments,
  periods,
  today = new Date(),
}: {
  creditBalanceCents: number;
  payments: LedgerPayment[];
  periods: LedgerPeriod[];
  today?: Date;
}) {
  const balances = derivePeriodBalances({ creditBalanceCents, periods });
  const paymentById = new Map(payments.map((payment) => [payment.id, payment]));
  const paymentApplications = derivePaymentApplications({ payments, periods });
  const rows: RentLedgerRow[] = periods
    .filter(
      (period) => {
        const balance = balances.get(period.id);
        return (
          period.periodMonth <= today ||
          period.status === PeriodStatus.RECEIVED ||
          Boolean(period.paymentId) ||
          (balance?.creditAppliedCents ?? 0) > 0
        );
      },
    )
    .map((period) => {
      const balance = balances.get(period.id) ?? {
        creditAppliedCents: 0,
        remainingCents:
          period.status === PeriodStatus.RECEIVED ? 0 : period.amountDueCents,
      };
      const directPayment = period.paymentId
        ? paymentById.get(period.paymentId)
        : null;
      const relatedPayments = paymentApplications.get(period.id) ?? [];
      const latestPartialPayment = [...relatedPayments].sort(
        (a, b) => b.payment.receivedAt.getTime() - a.payment.receivedAt.getTime(),
      )[0]?.payment;
      const status =
        period.status === PeriodStatus.RECEIVED
          ? "Paid"
          : balance.creditAppliedCents > 0
            ? "Partially paid"
            : "Unpaid";
      const context =
        status === "Paid"
          ? directPayment
            ? `Paid ${formatShortDate(directPayment.receivedAt)} · $${(period.amountDueCents / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
            : `Paid · $${(period.amountDueCents / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
          : status === "Partially paid"
            ? `${latestPartialPayment ? `Partially paid ${formatShortDate(latestPartialPayment.receivedAt)} · ` : "Partially paid · "}$${(balance.remainingCents / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })} remaining`
            : `Unpaid · $${(balance.remainingCents / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })} remaining`;

      return {
        id: `month:${period.id}`,
        kind: "month",
        date: period.periodMonth,
        activity: formatShortMonth(period.periodMonth),
        amountCents: period.amountDueCents,
        context,
        status,
        payments: relatedPayments.map(({ appliedCents, payment }) => ({
          id: payment.id,
          appliedCents,
          transactionAmountCents: payment.amountCents,
          paymentMethod: payment.paymentMethod,
          receivedAt: payment.receivedAt,
        })),
      };
    });

  return rows.sort((a, b) => b.date.getTime() - a.date.getTime());
}
