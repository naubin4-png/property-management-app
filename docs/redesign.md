# Property Manager Phase 2 Redesign

## Purpose

Phase 2 redesigns the existing, deployed application without replacing its
backend. The goal is a focused rent-operations tool that feels at home on a
phone: quick to scan, obvious to navigate, and comfortable to operate with one
hand.

`docs/spec.md` remains authoritative for backend behavior. This file is
authoritative for UI, navigation, routes, naming, mobile behavior, and demo
behavior.

## Product Language

- The app brand remains **Property Manager**.
- Remove the word `Property` from user-facing data labels where it is redundant.
  Use labels such as `Name`, `Add`, `Details`, and `Notes`.
- Do not remove `Property` from the brand or internal model/type names.
- Prefer concise operational language over administrative terminology.

## App Shell and Navigation

### Desktop

- Keep a compact top app bar with the Property Manager brand.
- Dashboard and Email are persistent destinations.
- Add and Log Payment remain primary actions.
- Avoid oversized page titles when the active destination is already clear.

### Mobile

- No hamburger menu anywhere.
- Use an always-visible bottom navigation/action bar with Dashboard, Email, Add,
  and Payment destinations/actions.
- The Property Manager brand remains in a compact top bar.
- Respect `env(safe-area-inset-bottom)` and `env(safe-area-inset-top)`.
- Every tap target is at least 44x44px.
- Content includes enough bottom padding to remain visible above fixed
  navigation.

### Secondary Surfaces

- Every non-dashboard page, modal, sheet, or panel has an obvious back or close
  control.
- Direct URLs remain meaningful and browser back/forward must work.
- Focus returns to the control that opened a modal or panel when practical.

## Dashboard

### Money Bar

- Show the current billing period prominently, then `Collected` and `Still due`.
- The billing period defaults to the current calendar month.
- `Collected` is the amount applied toward that billing period's rent
  obligations.
- `Still due` is the remaining unpaid amount for that billing period.
- Payments covering future months may explain advance payment on a card, but
  future obligations do not contribute to the displayed billing period totals.

### Card Groups

- Use property cards rather than desktop admin tables.
- `Unpaid` contains leases whose obligation for the displayed billing period is
  not fully satisfied.
- `Paid` contains leases whose obligation for the displayed billing period is
  fully satisfied.
- Hide an empty section instead of displaying an empty container.

### Status Color

- Red: unpaid beyond the configured grace period.
- Amber: due today or past due but still within the grace period.
- Neutral: future unpaid periods.
- Green may indicate paid/current states, but color is never the only status
  signal.
- Existing database `PeriodStatus` values remain unchanged; presentation status
  may be derived from dates and grace settings.

### Card Content

- Show the asset name prominently.
- Use one consistent card structure: property name, Paid/Unpaid badge, one
  primary payment-state line, optional secondary follow-up/next-due line, and an
  optional note when one exists.
- Only show a dollar amount on a card when it materially changes the action, such
  as a partial payment with a remaining balance.
- Advance-paid cards may show `Paid through [month]` plus the next due date.
- Cards are keyboard and pointer accessible and open the property slide-over.

## Property Slide-Over

- Selecting a card opens a right-side slide-over on larger screens and a
  full-height sheet on small screens.
- Preserve `/properties/[id]` as the canonical direct route. Dashboard selection
  may use route state/query state, but refreshing and sharing a property URL must
  still render useful details.
- The panel includes:
  - asset name and notes
  - tenant name and email
  - monthly rent, lease start, lease end
  - credit balance
  - currently due periods and upcoming periods
  - Log Payment
  - payment history with edit/delete controls
- Content should be compact. Payment history should begin above the fold where
  possible, but small screens may scroll internally.
- Future unpaid rows in the period list are neutral, not amber.
- Closing works via the visible close control, Escape, browser back, and a
  touch/pointer swipe where supported.
- Swipe gestures require actual touch/pointer event handling, not CSS alone.
- Respect reduced-motion preferences.

## Forms and Input Behavior

- Number fields use `inputmode="numeric"`.
- Dollar fields use `inputmode="decimal"`.
- Dates and months use native pickers where possible.
- Auto-focus the first field when a form, modal, or panel editor opens.
- Enter/next advances naturally; multiline fields retain normal Enter behavior.
- On mobile, focused fields scroll into view and remain above the keyboard.
- Primary and secondary actions are at least 44px tall.
- Preserve existing server-side validation and transactional mutations.

## Inline Editing

- Tenant name/email and eligible lease fields may be edited from the slide-over.
- Validate client-side for immediate feedback and server-side for authority.
- Inline edits never save empty required values, invalid email, invalid money, or
  malformed months.
- Lease end and rent edits must be safe and transactional.
- Lease end remains extend-only.
- Rent changes preserve the backend rule for updating eligible future periods.
- Failed edits leave all related records unchanged and display a useful error.

## Email

- Email settings use stacked, mobile-first cards rather than an admin table.
- Preserve existing timing toggles, numeric settings, subject/body copy, recent
  logs, Server Actions, and cron behavior.
- Recent email entries should be readable as compact activity cards on mobile.

## Demo

- Demo and authenticated app share shell, cards, slide-over, forms, and responsive
  behavior.
- Demo-specific UI is limited to:
  - `Demo mode - sample data, nothing is saved`
  - `Owner sign in`
- Demo mutations remain local and reset on reload.
- Demo dashboard scenarios include fully unpaid, partially paid, paid this
  month, and advance-paid leases for the displayed billing period.
- The demo money bar must match sample card data exactly.
- Include realistic paid/current assets, future due dates, notes, emails, tenant
  details, lease details, periods, and payment history for panel testing.

## Routes

- `/` - authenticated dashboard and card overview
- `/demo` - public demo using the shared app experience
- `/email` - email settings
- `/properties/[id]` - canonical asset detail route, presented with the shared
  detail panel/sheet treatment
- `/?addProperty=1` - Add flow
- `/?logPayment=1` - Log Payment flow
- Existing lease routes may remain as direct fallbacks while inline panel editing
  is introduced.

## Accessibility and Responsive Acceptance

- Keyboard users can reach and activate every card and action.
- Escape closes dismissible overlays.
- Focus indicators are visible.
- Text and controls remain usable at 375px without horizontal scrolling.
- Fixed navigation does not cover content.
- Color is paired with text.
- Motion is subtle and disabled or reduced when the user requests reduced
  motion.

## Backend Guardrails

Do not change these contracts as part of the redesign:

- Supabase authentication and route protection
- Prisma models and existing migrations, except a separately justified additive
  migration
- oldest-first payment allocation
- credit computation
- payment edit/delete reversal
- email settings and logs
- cron authorization, schedules, and idempotency
- Vercel and Supabase environment/deployment assumptions
