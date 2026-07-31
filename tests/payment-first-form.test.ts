import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  initialPaymentFirstFormState,
  updatePaymentFirstAmount,
  updatePaymentFirstMonthlyRent,
  updatePaymentFirstReceivedAt,
  updatePaymentFirstRentMonth,
} from "../lib/payment-first-form";

describe("payment-first form defaults", () => {
  it("follows the received date until the rent month is manually changed", () => {
    let state = initialPaymentFirstFormState("2026-07-31", "1000.00");
    state = updatePaymentFirstReceivedAt(state, "2026-06-15");
    assert.equal(state.firstPeriodMonth, "2026-06");

    state = updatePaymentFirstRentMonth(state, "2026-05");
    state = updatePaymentFirstReceivedAt(state, "2026-08-01");
    assert.equal(state.firstPeriodMonth, "2026-05");
  });

  it("copies the payment amount until monthly rent is manually corrected", () => {
    let state = initialPaymentFirstFormState("2026-07-31", "2500.00");
    state = updatePaymentFirstAmount(state, "1250.00");
    assert.equal(state.monthlyRent, "1250.00");

    state = updatePaymentFirstMonthlyRent(state, "2500.00");
    state = updatePaymentFirstAmount(state, "5000.00");
    assert.equal(state.monthlyRent, "2500.00");
  });
});
