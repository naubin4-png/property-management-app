# Payment and Money Logic Hardening Mission

## Acceptance Check

- `pnpm test` passes with explicit tests for:
  - a payment that leaves a numeric lease-scoped credit;
  - a later payment consuming that credit oldest-first;
  - payment edit/reallocation without double-counting shared credit;
  - deleting a multi-month advance and reopening every covered period;
  - exact fixed-term final payment acceptance and one-cent overpayment rejection;
  - duplicate `clientRequestId` submissions creating one payment;
  - zero and negative amounts being rejected without persistence.
- `pnpm build` passes.
- The tests document these decisions: credit is lease-scoped and oldest-first;
  fixed-term excess is rejected; deleted advances leave covered periods
  pending with no residual credit; zero and negative amounts are errors.
- Reusing a `clientRequestId` with a different payload is parked as a future
  conflict-behavior decision; this mission does not change that behavior.

## Objective

Prove the payment allocation, credit, edit, deletion, fixed-term, duplicate,
and invalid-amount money behavior before a paying customer relies on it.

## Out of Scope

No deployment, production data changes, UI redesign, email work, or change to
the parked duplicate-payload conflict behavior.

## Retry Cap

3

## Evidence

Passed:

- `pnpm exec prisma generate` — passed.
- `pnpm lint` — passed.
- `pnpm test` — 92 tests passed.
- `pnpm build` — passed with the existing Edge Runtime warning for Supabase.
- New tests prove numeric lease-scoped credit, later credit consumption,
  fixed-term exact-boundary behavior, one-cent excess rejection, zero and
  negative rejection, multi-month advance reversal, and existing duplicate
  request idempotency coverage.
- Fixed-term excess payments remain rejected.
- Reusing a `clientRequestId` with a different payload remains parked as a
  future conflict-behavior decision; no behavior change was made for it.

Implementation commit SHA: `PENDING`
