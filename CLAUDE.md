# CLAUDE.md

Orientation file for AI agents. Read this first, then read `AGENTS.md`.

## Read this before answering the first message

Do these before you reply to the user's first request in a session.
They are cheap and they are what let you answer in context instead of asking
questions the repo already answers.

1. **Read `AGENTS.md` in full.** It is the authoritative rulebook for this
   repository: architecture rules, UI rules, observability rules, database
   rules, Docker rules, commands, and the Safe Change Checklist. Everything
   below is a pointer to it, not a replacement for it.
2. **Identify the project.** Read `package.json` for `name`, `version`,
   `packageManager`, `engines`, and the `scripts` block. The directory name is
   not authoritative — `package.json` is.
3. **Read `docs/README.md`** for the documentation workflow, then list
   `docs/design/` and `docs/changes/` and read the most recent two or three
   entries. They tell you what was last worked on and why, which is usually
   the fastest route into the user's actual context.
4. **Check state:** `git log --oneline -10` and `git status`. Recent commits
   plus uncommitted work tell you where the user left off.
5. **Then respond.** Open by stating briefly what you understood — the project,
   its stack, and what you think is being asked — and either propose a concrete
   next step or ask the one question that actually blocks you. See below.

## How to open a session

Once oriented, lead with a short orientation line, not a wall of text:

> This is `nextjs-drizzle` — Next.js App Router + Drizzle + Tailwind v4,
> pnpm-managed. Last change in `docs/changes/` was <X>. You're asking about <Y>.

Then do one of two things:

- **Propose**, when the request is clear enough to act on: name the approach in
  one or two sentences and start. Do not present a menu of options you are not
  going to pursue.
- **Ask**, only when two readings of the request lead to materially different
  work — different files, different architecture, different scope. Ask that one
  question. Do not ask questions the repo already answers.

Never open with a broad "what would you like me to do?" when the user has
already told you. Never start editing files before step 1.

## Non-negotiables

These are stated fully in `AGENTS.md`. They are repeated here because agents
skip them most often:

- **Design first.** For any non-trivial change, write a design doc in
  `docs/design/` from `docs/templates/design-doc.md` *before* touching code.
  See the "Workflow Rules" section of `AGENTS.md` for what counts as non-trivial.
- **Record every change.** Write a change record in `docs/changes/` from
  `docs/templates/change-record.md`, in the same commit as the code.
  See "Documentation Rules" in `AGENTS.md`.
- **Use `pnpm`.** Never `npm` or `yarn`.
- **Run `pnpm check`** for any code change. Add `pnpm e2e` when routes, pages,
  or flows change; `pnpm observability:test` when tracing, metrics, or logging
  change.
- **Do not add abstraction layers** without a concrete problem to solve.
- **Use the `add-feature` skill** when adding anything under `src/features/`. It encodes
  the repo's contracts/service/repository shape and its tracing rules.

## Where things live

| Question | Read |
| --- | --- |
| What are the rules for this repo? | `AGENTS.md` |
| How do I document a change? | `docs/README.md` |
| What was recently changed and why? | `docs/changes/` |
| What is planned or in progress? | `docs/design/` |
| What commands exist? | `scripts` in `package.json` |
| What env vars are needed? | `.env.example` |
| How does CI run? | `.github/workflows/ci.yml` |
| How do I add a feature? | the `add-feature` skill in `.claude/skills/` |
| Why did a command not prompt me? | `.claude/settings.json` |

## Communication

The maintainer writes in Thai. Reply in Thai unless asked otherwise. Keep code,
identifiers, commit messages, and `AGENTS.md` in English.
