export const NEW_LEASE_OPTION = "__new_lease__";

export type PaymentFirstFormState = {
  receivedAt: string;
  firstPeriodMonth: string;
  rentMonthManuallyChanged: boolean;
  amount: string;
  monthlyRent: string;
  monthlyRentManuallyChanged: boolean;
};

export function monthFromDateInput(receivedAt: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(receivedAt)
    ? receivedAt.slice(0, 7)
    : "";
}

export function initialPaymentFirstFormState(
  receivedAt: string,
  amount = "",
): PaymentFirstFormState {
  return {
    receivedAt,
    firstPeriodMonth: monthFromDateInput(receivedAt),
    rentMonthManuallyChanged: false,
    amount,
    monthlyRent: amount,
    monthlyRentManuallyChanged: false,
  };
}

export function updatePaymentFirstReceivedAt(
  state: PaymentFirstFormState,
  receivedAt: string,
) {
  return {
    ...state,
    receivedAt,
    firstPeriodMonth: state.rentMonthManuallyChanged
      ? state.firstPeriodMonth
      : monthFromDateInput(receivedAt),
  };
}

export function updatePaymentFirstRentMonth(
  state: PaymentFirstFormState,
  firstPeriodMonth: string,
) {
  return {
    ...state,
    firstPeriodMonth,
    rentMonthManuallyChanged: true,
  };
}

export function updatePaymentFirstAmount(
  state: PaymentFirstFormState,
  amount: string,
) {
  return {
    ...state,
    amount,
    monthlyRent: state.monthlyRentManuallyChanged
      ? state.monthlyRent
      : amount,
  };
}

export function updatePaymentFirstMonthlyRent(
  state: PaymentFirstFormState,
  monthlyRent: string,
) {
  return {
    ...state,
    monthlyRent,
    monthlyRentManuallyChanged: true,
  };
}

export function formatRentMonth(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return "";
  }

  return new Date(`${month}-01T00:00:00.000Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
