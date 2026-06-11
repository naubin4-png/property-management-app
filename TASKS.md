# TASKS.md

Active Phase 2 UI/UX redesign sequence. Complete tasks in order. After each
task, run `pnpm build`, verify the task in the browser, update `STATUS.md`,
commit, and push to `main`.

Backend behavior remains governed by `docs/spec.md`. UI behavior is governed by
`docs/redesign.md`.

---

## Phase 2 Task 0: Documentation Reset

**Do this:**
- Archive the completed original plan in `docs/original-build-tasks.md`
- Establish the source-of-truth hierarchy in `AGENTS.md`
- Add the backend authority warning to `docs/spec.md`
- Create `docs/redesign.md`
- Replace `TASKS.md` with this active Phase 2 sequence
- Add Phase 2 status tracking to `STATUS.md`

**Done when:**
- [ ] The original Task 0-9 plan is preserved verbatim in the archive
- [ ] Documentation conflict rules are explicit
- [ ] UX principles are explicit
- [ ] All Phase 2 tasks appear in `STATUS.md` as Not started
- [ ] `pnpm build` passes

---

## Phase 2 Task 1: Native App Shell and Navigation

**Do this:**
- Keep the `Property Manager` brand
- Replace the mobile hamburger with always-visible, touch-friendly navigation
- Keep desktop navigation compact and familiar
- Provide obvious back/close controls on all non-dashboard surfaces
- Make real and demo shells share components
- Add safe-area handling and 44px minimum touch targets

**Done when:**
- [ ] No hamburger menu exists at any viewport
- [ ] Dashboard, Email, Add, and Payment actions remain reachable
- [ ] Navigation works at 375px and desktop widths
- [ ] Demo adds only its demo banner and Owner sign in affordance
- [ ] `pnpm build` passes

---

## Phase 2 Task 2: Money Semantics and Dashboard Cards

**Do this:**
- Replace dashboard tables with native-feeling property cards
- Remove `Property` from user-facing data labels while preserving the brand
- Compute Outstanding from unpaid rent due today or earlier only
- Exclude future unpaid periods from Needs Attention
- Use red beyond grace, amber due/past-due within grace, neutral for future
- Preserve inline operational notes with validation
- Keep Collected this month behavior unchanged

**Done when:**
- [ ] Dashboard uses shared responsive cards, not admin tables
- [ ] Future periods do not inflate Outstanding
- [ ] Future periods do not create Needs Attention cards
- [ ] Red/amber/neutral states follow the redesign rules
- [ ] Card selection works with mouse, keyboard, and touch
- [ ] `pnpm build` passes

---

## Phase 2 Task 3: Property Slide-Over

**Do this:**
- Open property details in a shared slide-over from dashboard cards
- Preserve direct `/properties/[id]` routes and browser history
- Show tenant, lease, due periods, credit, notes, and payment history compactly
- Start payment history above the fold where possible
- Allow internal scrolling on small screens
- Keep future unpaid periods neutral
- Add close/back controls and focus management

**Done when:**
- [ ] Every dashboard card opens the correct property
- [ ] Direct property URLs remain usable
- [ ] Payment history is visible without excessive vertical ceremony
- [ ] Small screens scroll inside the panel without trapping the page
- [ ] Demo uses the same panel component
- [ ] `pnpm build` passes

---

## Phase 2 Task 4: Native Forms and Modal Ergonomics

**Do this:**
- Apply numeric/decimal input modes
- Use native date/month pickers
- Auto-focus first fields
- Make Enter/next progression natural
- Keep active inputs visible above the mobile keyboard
- Ensure modal actions and close controls are at least 44px
- Preserve transactional add-property and payment behavior

**Done when:**
- [ ] Add and payment flows work at desktop and 375px
- [ ] Appropriate mobile keyboards are requested
- [ ] Focus and submit progression are predictable
- [ ] No modal lacks an obvious close action
- [ ] `pnpm build` passes

---

## Phase 2 Task 5: Safe Inline Editing

**Do this:**
- Add compact inline editing for tenant and lease details in the slide-over
- Validate all edits before saving
- Make lease end and rent changes transactional
- Preserve extend-only lease rules and future-period rent behavior
- Surface actionable validation errors without leaving the panel

**Done when:**
- [ ] Invalid tenant, rent, or month values are rejected visibly
- [ ] Lease shortening remains impossible
- [ ] Rent edits update only allowed periods
- [ ] Failed edits leave database state unchanged
- [ ] Successful edits refresh dashboard and panel data
- [ ] `pnpm build` passes

---

## Phase 2 Task 6: Email Experience

**Do this:**
- Redesign Email as a mobile-first settings surface
- Keep timing, copy, recent logs, and backend settings unchanged
- Remove admin-table styling
- Add obvious dashboard/back navigation
- Use numeric input modes and 44px controls

**Done when:**
- [ ] Existing settings persist unchanged
- [ ] Both reminder toggles and timing fields remain functional
- [ ] Recent email history is readable on mobile
- [ ] Cron and email backend behavior is untouched
- [ ] `pnpm build` passes

---

## Phase 2 Task 7: Demo Parity and Gestures

**Do this:**
- Use the same shell, cards, panel, and forms as the real app
- Include three Needs Attention amounts: $4,000, $13,600, and $5,200
- Set demo Outstanding to exactly $22,800
- Keep sample collected data internally consistent
- Implement slide-over swipe-to-close with pointer/touch events
- Keep demo mutations local and clearly non-persistent

**Done when:**
- [ ] Demo money bar equals its card data
- [ ] Demo and real UI share the same components
- [ ] Swipe-to-close works on touch/pointer input
- [ ] Mouse/keyboard close behavior still works
- [ ] `pnpm build` passes

---

## Phase 2 Task 8: Final Verification and Production Release

**Do this:**
- Verify all Phase 2 requirements in the browser
- Verify backend payment, credit, edit/delete reversal, auth, email, and cron
  contracts remain intact
- Check desktop and 375px mobile behavior
- Check direct routes, back/forward history, focus, touch targets, and console
- Confirm production deployment after the final push

**Done when:**
- [ ] All Phase 2 task checklists pass
- [ ] Backend regression checks pass
- [ ] No console errors, TODOs, debug artifacts, or dead code remain
- [ ] `pnpm build` passes
- [ ] Production demo and authenticated app load successfully
