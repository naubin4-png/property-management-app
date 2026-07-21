# CLAUDE.md

Claude Code should use the same project rules as Codex.

Read these files before planning product work:

1. `AGENTS.md`
2. `docs/AGENT_WORKFLOW.md`
3. `docs/spec.md` for backend contracts
4. `docs/redesign.md` for current UX behavior

Do not duplicate or reinterpret the authoritative instructions here. This file
is only a compatibility entrypoint for Claude Code.

Important defaults:

- The app is complete and deployed; do not run completed Phase 2 tasks.
- `TASKS.md`, `STATUS.md`, and `docs/original-build-tasks.md` are historical
  unless the user explicitly says otherwise.
- For every user-facing request, observe current behavior in a browser before
  asking questions or planning when browser access is available.
- Ask only questions whose answers materially change the product outcome or
  implementation.
- Preserve backend contracts from `docs/spec.md`.
- Use the smallest appropriate change and verify it with browser interactions
  plus relevant build, lint, type, database, or curl checks.
- Do not stage, commit, or push unless the user asks for it. Never push directly
  to `main` unless explicitly authorized.
