# Agent Workflow

This is the shared workflow for Codex and Claude Code. The user should be able
to describe a business or product problem naturally without knowing tool,
capability, or skill names.

## Default Loop

1. Inspect the repository state and relevant source files.
2. For every user-facing request, inspect the running product in the connected
   browser before asking questions or planning when browser access is available.
3. Classify the request.
4. Ask only outcome-changing questions.
5. Decide whether the symptom is local or caused by shared architectural
   divergence.
6. Implement the smallest safe change.
7. Verify the exact behavior with real browser interactions and relevant
   commands.
8. Return a concise, reviewable result with before/after evidence.

If browser access or an authenticated session is unavailable, say so explicitly
and do not claim browser-verified behavior.

## Tool And Application Use

- At the beginning of a task, identify the available repository, browser, CLI,
  connected-application, database, deployment, and verification capabilities
  relevant to the requested outcome.
- Use available capabilities directly instead of asking the user to perform
  actions the agent can safely perform.
- Treat existing implementation as evidence, not proof of intended product
  behavior.
- Treat browser, application, database, log, deployment, and GitHub access as
  parts of the working environment, not merely sources of documentation.
- Prefer the simplest capability that provides reliable evidence.
- Do not claim access to a capability that is unavailable.
- Obtain approval before consequential external actions, destructive changes,
  production data mutations, deployments, or communications when authorization
  is not already explicit.

## Routing

### Localized Bug

Use when a specific existing behavior is broken or surprising.

Examples:

- "The email address does not respond when tapped on mobile."
- "This button does nothing."
- "The Add Check modal closes without saving."

Route:

- Reproduce or observe the current behavior in browser at the relevant viewport.
- Inspect the surrounding user journey, not just the reported element.
- Diagnose from code and current behavior.
- Decide whether the bug is local or caused by shared architectural divergence.
- Make the smallest fix.
- Repeat the exact interaction after implementation.
- Verify relevant desktop/mobile behavior and console state.

### Small Product Change

Use when the desired outcome is clear and the change is narrow.

Examples:

- "Show tenant email under the tenant name in the panel."
- "Change this button copy."
- "Make the demo banner less tall."

Route:

- Observe the current surface in browser.
- Confirm the request does not conflict with product docs or backend contracts.
- Implement the smallest shared-component change.
- Verify demo/real parity when shared UI is touched.
- Verify relevant desktop/mobile behavior and console state.

### Ambiguous Feature

Use when the business goal is clear but the product behavior is not.

Examples:

- "Make reminders smarter."
- "Help me see who needs follow-up."
- "Make this easier for friends to understand."

Route:

- Observe the current related workflow in browser before asking questions when
  possible.
- Use the repository and current behavior to answer obvious questions yourself.
- Ask only the questions that materially change product outcome or
  implementation.
- After intent is clear, choose localized bug, small change, or redesign/refactor
  route.
- Do not build broad discovery artifacts unless the user asks.

### Redesign / Refactor

Use when the request changes multiple workflows, information architecture,
backend contracts, or shared component patterns.

Examples:

- "Rethink the dashboard."
- "Replace the lease flow."
- "Refactor payment allocation."

Route:

- Observe current behavior in browser across affected workflows.
- Identify backend contracts and regression risks before planning.
- Propose a short plan and wait for approval when scope or product direction is
  materially broad.
- Implement in small, reviewable steps after approval.
- Verify affected workflows, relevant viewports, database behavior, and build.

## Browser Evidence

For user-facing work:

- Inspect current behavior before planning when browser access is available.
- Reproduce or observe at the relevant viewport.
- Inspect the surrounding user journey.
- Verify the intended user outcome, not merely the element, href, handler, or
  isolated technical mechanism.
- After implementation, perform the exact user interaction again.
- Verify relevant desktop/mobile behavior.
- Check browser console state.
- Report concise before/after evidence in the final response.
- Do not create permanent verification diaries unless explicitly requested.

## Question Policy

Ask only when the answer materially changes one of these:

- product outcome
- user-facing behavior
- data model or backend contract
- implementation risk
- destructive or irreversible action

Do not ask the user to choose tools, skill names, commands, or internal
capabilities. Select useful diagnosis, product-intent, browser QA, testing, and
review capabilities automatically.

If a request has multiple materially different product outcomes, ask one concise
outcome-level question before coding.

## Verification Commands

Use the smallest verification set that matches the change:

- Use focused checks while working.
- Run `pnpm build` before declaring a source-code change merge-ready, before
  deployment, and whenever the change could affect compilation, routing,
  rendering, dependencies, or production behavior.
- Use lint or TypeScript checks when source changes make them useful.
- Use direct Prisma queries when database behavior changes.
- Use curl for route, API, cron, auth redirect, or deployment checks.
- Use browser checks for all user-facing behavior claims.
- Verify demo parity whenever shared UI changes.
- Demo and production must share UI, navigation, validation, and behavior. Demo
  may differ only in example data, authentication bypass, persistence, and safe
  handling of external side effects.
- User acceptance overrides agent assumptions. Do not call work complete while
  the observed business outcome remains unverified.

## Stop / Escalate

Stop and explain rather than guessing when:

- The same blocker persists after two retries.
- Browser or authentication access is unavailable for required behavioral
  verification.
- The request would require destructive data changes.
- The requested change conflicts with `docs/spec.md` backend contracts.
- The product outcome is ambiguous and the needed answer materially affects the
  implementation.
