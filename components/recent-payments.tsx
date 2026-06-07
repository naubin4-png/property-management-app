"use client";

import { useState } from "react";

import { formatMoney, formatMonth } from "@/lib/lease-math";

export type PropertyPayment = {
  id: string;
  receivedAt: Date;
  amountCents: number;
  paymentMethod: string | null;
  paymentReference: string | null;
};

export function RecentPayments({ payments }: { payments: PropertyPayment[] }) {
  const [showAll, setShowAll] = useState(false);
  const visiblePayments = showAll ? payments : payments.slice(0, 5);

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
          Recent Payments
        </h2>
        {payments.length > 5 ? (
          <button
            className="text-sm font-medium text-zinc-700 hover:text-zinc-950"
            onClick={() => setShowAll((current) => !current)}
            type="button"
          >
            {showAll ? "Show Recent" : "View All"}
          </button>
        ) : null}
      </div>

      {payments.length === 0 ? (
        <div className="mt-3 rounded-lg border border-zinc-200 bg-white px-5 py-8 text-center text-sm text-zinc-500">
          No payments recorded yet.
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <div className="hidden grid-cols-4 gap-4 border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 sm:grid">
            <span>Date</span>
            <span>Amount</span>
            <span>Method</span>
            <span>Reference</span>
          </div>
          <div className="divide-y divide-zinc-100">
            {visiblePayments.map((payment) => (
              <div
                className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-4 sm:gap-4"
                key={payment.id}
              >
                <div>
                  <span className="text-zinc-500 sm:hidden">Date: </span>
                  <span className="text-zinc-900">{formatMonth(payment.receivedAt)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 sm:hidden">Amount: </span>
                  <span className="font-medium text-zinc-950">
                    ${formatMoney(payment.amountCents)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 sm:hidden">Method: </span>
                  <span className="text-zinc-600">{payment.paymentMethod ?? "-"}</span>
                </div>
                <div>
                  <span className="text-zinc-500 sm:hidden">Reference: </span>
                  <span className="text-zinc-600">
                    {payment.paymentReference ?? "-"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
