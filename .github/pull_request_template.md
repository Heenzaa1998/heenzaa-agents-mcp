## What changed

<!-- 1-3 sentences. The diff shows what; say why. -->

## Documents

Per `AGENTS.md`, non-trivial changes need both. Link them:

- Design doc: `docs/design/YYYY-MM-DD-<slug>.md`
- Change record: `docs/changes/YYYY-MM-DD-<slug>.md`

<!-- Trivial change (typo, copy tweak, formatting)? Say so here and link the change record only. -->

## Verified

- [ ] `pnpm check` (lint + typecheck + unit tests)
- [ ] `pnpm e2e` — required if routes, pages, or user flows changed
- [ ] `pnpm observability:test` — required if tracing, metrics, or logging changed
- [ ] Docker build/run — required if `Dockerfile`, `next.config.ts`, or runtime assumptions changed
- [ ] Migration generated and applied — required if `src/server/db/schema.ts` changed

Anything not run, and why:

## Risk / rollback

<!-- What could break, and how to undo it. -->
