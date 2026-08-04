# Product contract

## Purpose and access

Property Manager helps a small landlord answer who paid, who has not, what
happened, and what needs action across a commercial lease portfolio.

- The public demo is side-effect safe and resets its sample state.
- Real use is invite-only. A platform administrator creates a customer
  workspace and Gmail invitation; the link is shared manually.
- The recipient signs in with the invited Google identity. An uninvited or
  mismatched identity receives no workspace data.
- The initial customer role is `OWNER`. The schema reserves `MEMBER` for future
  collaboration, but the current product assigns one customer workspace per
  client and selects the oldest active membership.
- The platform administrator has a separate developer workspace. Administrator
  status alone does not grant access to customer workspaces.

## Core journeys

### Dashboard and leases

- The dashboard summarizes the current billing month as collected and still
  due, then groups lease cards into Paid and Unpaid.
- A card opens the canonical lease/property detail route. Direct URLs, browser
  history, desktop, and mobile remain supported.
- Lease detail shows current rent status, tenant and lease facts, the editable
  lease note, and monthly rent history without future unpaid filler.
- A lease requires a property name, tenant name, first tracked rent month, and
  monthly rent. Tenant email and lease end are optional.
- The payment-first flow may create the missing property, open-ended lease, and
  payment together using the minimum truthful fields.
- A property may have only one active lease. Existing leases may be extended;
  rent changes affect only eligible future periods.

### Payments

- The owner records one amount against a lease and never selects allocation
  months manually.
- The server applies available credit and new cash to the oldest unpaid monthly
  obligations first. A payment may cover full months and leave partial credit.
- Open-ended leases generate additional periods as needed. A fixed-term lease
  rejects payment beyond its remaining rent.
- Payment creation is idempotent. Editing reverses the original allocation and
  reallocates atomically; deleting reverses it and removes the payment.
- Monthly history uses the period's snapshotted rent, not the lease's current
  rent, so historical totals remain truthful after rent changes.

### Tenant emails

- Tenant emails include pre-due reminders and late notices with workspace-owned
  timing, copy, timezone, reply-to address, and delivery history.
- The two reminder controls determine whether automation is enabled; there is
  no separate product-facing master checkbox.
- Missing tenant email skips delivery without blocking rent tracking.
- Resend acceptance and signed webhook events update delivery state. Duplicate
  cron runs, retries, and provider events must not duplicate mail or regress a
  terminal delivery outcome.

## Experience contract

- Use plain landlord language: **Lease**, **Record payment**, **Tenant emails**,
  **Paid**, and **Unpaid**.
- Desktop and mobile expose the same actions. Mobile uses persistent navigation,
  never a hamburger menu.
- Controls remain keyboard accessible, visibly focused, and at least 44px.
  Money fields request decimal input; counts request numeric input; dates use
  native pickers where practical.
- Every secondary surface has an obvious close or back action. Demo and real
  app reuse the same product components.
