import { addMonths, enumerateLeaseMonths } from "@/lib/lease-periods";

export type PaymentForecastPeriod = {
  id: string;
  periodMonth: Date | string;
  amountDueCents: number;
  status: "PENDING" | "LATE" | "RECEIVED" | "DUE" | "UPCOMING";
  paymentId: string | null;
};

export type PaymentForecastPayment = {
  id: string;
  amountCents: number;
};

export type PaymentForecastInput = {
  amountCents: number;
  currentMonth: Date | string;
  editedPaymentId?: string;
  ensurePeriodsThroughCurrent?: boolean;
  firstPeriodMonth: Date | string;
  lastPeriodMonth: Date | string | null;
  payments: PaymentForecastPayment[];
  periods: PaymentForecastPeriod[];
  rentCents: number;
};

export function formatPaymentForecastRemainder({
  creditCents,
  nextDueDate,
  nextDueRemainingCents,
}: {
  creditCents: number;
  nextDueDate: Date | null;
  nextDueRemainingCents: number | null;
}) {
  if (creditCents <= 0) {
    return "";
  }

  const currency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

  if (
    nextDueDate &&
    nextDueRemainingCents !== null &&
    nextDueRemainingCents > 0
  ) {
    const month = nextDueDate.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
    return ` ${currency.format(nextDueRemainingCents / 100)} still due for ${month}.`;
  }

  return ` Credit: ${currency.format(creditCents / 100)}.`;
}

function asDate(value: Date | string) {
  return new Date(value);
}

export function forecastPaymentAllocation(
  input: PaymentForecastInput,
) {
  const periods = input.periods.map((period) => ({
    ...period,
    periodMonth: asDate(period.periodMonth),
    paymentId:
      period.paymentId === input.editedPaymentId ? null : period.paymentId,
    status:
      period.paymentId === input.editedPaymentId
        ? ("PENDING" as const)
        : period.status,
  }));
  const payments = input.payments.filter(
    (payment) => payment.id !== input.editedPaymentId,
  );
  const allocatedCents = periods
    .filter((period) => period.status === "RECEIVED")
    .reduce((total, period) => total + period.amountDueCents, 0);
  const creditBeforeEditCents =
    payments.reduce((total, payment) => total + payment.amountCents, 0) -
    allocatedCents;
  let remainingCents = creditBeforeEditCents + input.amountCents;
  const firstPeriodMonth = asDate(input.firstPeriodMonth);
  const lastPeriodMonth = input.lastPeriodMonth
    ? asDate(input.lastPeriodMonth)
    : null;
  const currentMonth = asDate(input.currentMonth);

  if (input.ensurePeriodsThroughCurrent !== false) {
    for (const periodMonth of enumerateLeaseMonths({
      firstPeriodMonth,
      lastPeriodMonth,
      minimumThrough: currentMonth,
    })) {
      if (
        !periods.some(
          (period) => period.periodMonth.getTime() === periodMonth.getTime(),
        )
      ) {
        periods.push({
          id: `forecast-${periodMonth.toISOString().slice(0, 7)}`,
          periodMonth,
          amountDueCents: input.rentCents,
          status: "PENDING",
          paymentId: null,
        });
      }
    }
  }

  periods.sort(
    (left, right) => left.periodMonth.getTime() - right.periodMonth.getTime(),
  );

  const openPeriods = () =>
    periods.filter((period) => period.status !== "RECEIVED");
  const existingOpenCents = openPeriods().reduce(
    (total, period) => total + period.amountDueCents,
    0,
  );
  const additionalMonths = Math.floor(
    Math.max(remainingCents - existingOpenCents, 0) / input.rentCents,
  );

  if (!lastPeriodMonth && additionalMonths > 0) {
    let periodMonth = addMonths(
      periods.at(-1)?.periodMonth ?? firstPeriodMonth,
      periods.length ? 1 : 0,
    );
    for (let index = 0; index < additionalMonths; index += 1) {
      periods.push({
        id: `forecast-${periodMonth.toISOString().slice(0, 7)}`,
        periodMonth,
        amountDueCents: input.rentCents,
        status: "PENDING",
        paymentId: null,
      });
      periodMonth = addMonths(periodMonth, 1);
    }
  }

  const applications: Array<{
    amountDueCents: number;
    periodMonth: Date;
  }> = [];
  for (const period of openPeriods()) {
    if (remainingCents < period.amountDueCents) {
      break;
    }
    remainingCents -= period.amountDueCents;
    period.status = "RECEIVED";
    period.paymentId = input.editedPaymentId ?? "forecast-payment";
    applications.push({
      amountDueCents: period.amountDueCents,
      periodMonth: period.periodMonth,
    });
  }

  if (
    !periods.some((period) => period.status !== "RECEIVED") &&
    (!lastPeriodMonth ||
      (periods.at(-1)?.periodMonth ?? firstPeriodMonth) < lastPeriodMonth)
  ) {
    const periodMonth = addMonths(
      periods.at(-1)?.periodMonth ?? firstPeriodMonth,
      periods.length ? 1 : 0,
    );
    periods.push({
      id: `forecast-${periodMonth.toISOString().slice(0, 7)}`,
      periodMonth,
      amountDueCents: input.rentCents,
      status: "PENDING",
      paymentId: null,
    });
  }

  const nextDuePeriod = periods.find((period) => period.status !== "RECEIVED");
  const nextDueRemainingCents = nextDuePeriod
    ? Math.max(nextDuePeriod.amountDueCents - remainingCents, 0)
    : null;

  return {
    applications,
    creditBeforeEditCents,
    creditCents: remainingCents,
    nextDueAmountCents: nextDuePeriod?.amountDueCents ?? null,
    nextDueDate: nextDuePeriod?.periodMonth ?? null,
    nextDueRemainingCents,
    periods,
  };
}
