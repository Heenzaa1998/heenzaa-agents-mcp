# Heenzaa Studio

An MCP server that lets Claude make images and video. You connect it to claude.ai
as a custom connector, ask for a picture or a clip in a chat, and the server calls
the models on [KIE.ai](https://kie.ai), copies every result into a private
Cloudflare R2 bucket, and logs it in Postgres. A small private website shows the
gallery, groups work into projects and shots, and reports what everything cost.

The repository started from a Next.js + Drizzle starter, which is why
`package.json` is still named `nextjs-drizzle`.

## MCP tools

The endpoint is `POST /api/mcp` (Streamable HTTP, via `mcp-handler`).

| Tool | What it does |
| --- | --- |
| `generate_image` | Text to image with GPT Image 2 (any aspect ratio, 1K/2K/4K). |
| `edit_image` | Edit or restyle images with GPT Image 2 (or 1.5). Inputs are URLs or storage keys. |
| `generate_video` | Kling 3.0 (3–15 s, first/last frame, up to 3 reference "elements") or Kling 2.6 (5/10 s). Returns a task id. |
| `generate_talking_video` | Kling AI Avatar: animates a character so its mouth follows a given audio file. Returns a task id. |
| `upload_reference` | Stores a reference image under a name (`refs/<name>.<ext>`) from a URL, a stored key or base64. |
| `list_references` | Lists stored references and their keys. |
| `get_media_url` | Fresh 7-day download link for any stored key (`images/…`, `videos/…`, `refs/…`). |
| `get_task_status` | Checks a video task, or an image task that outlasted the 240 s wait; stores the file when done. |
| `list_generations` | Searches the generation history. |
| `get_costs` | Credits and baht per project and shot, chosen takes, cost per second used, KIE balance. |

Image tools wait for the result (up to 240 s) and then return a link plus a
storage key. Video tools return a task id at once; `get_task_status` collects the
file later. Every generation tool also takes optional `project` and `shot` tags.

Any input image can be a storage key instead of a URL. The server presigns it
before KIE sees it, so a reference uploaded once keeps working after old links
expire.

## Web pages

| Path | Access | Purpose |
| --- | --- | --- |
| `/` | public | What the studio is, the tools, how to connect. Shows only the showcase art in `public/showcase/`. |
| `/gallery` | password | Every generation with filters, thumbnails, "check" for pending tasks, and project/shot assignment. |
| `/projects`, `/projects/[id]` | password | Cost per project; shot board with references, keyframes, video takes, a frame inspector and "use this take". |
| `/api/health` | public | Health JSON (app, database, tracing). |
| `/metrics` | public | Prometheus metrics. |

The site is in Thai by default, with English. All copy lives in
`src/content/i18n/{th,en}.ts`.

## How it fits together

```text
claude.ai ──▶ /api/mcp (token check) ──▶ src/features/<feature>/service.ts
                                           ├─▶ KIE.ai jobs API (src/server/kie)
                                           ├─▶ Cloudflare R2, private (src/server/storage)
                                           └─▶ Neon Postgres via Drizzle (repository.ts)
```

- Route handlers stay thin; feature logic lives in `src/features/<feature>/`
  (`contracts.ts` → `service.ts` → `repository.ts`); shared infrastructure lives in
  `src/server/`.
- Files are stored by key and never made public. Pages and tools hand out
  presigned links instead (1 hour on pages, 7 days from tools).
- Money is stored as KIE credits. Baht is credits × the rate set on `/projects`.

## Stack

Next.js 16 (App Router, standalone output) · React 19 · Tailwind CSS v4 + shadcn/ui ·
Zod 4 · Drizzle ORM on Neon Postgres (HTTP driver) · Cloudflare R2 via `aws4fetch` ·
`sharp` for thumbnails · Pino · prom-client · OpenTelemetry → Grafana Tempo ·
Vitest + Playwright · pnpm 10, Node ≥ 20.9.

## Local setup

```bash
pnpm install
Copy-Item .env.example .env.local   # PowerShell; use cp on macOS/Linux
vercel env pull .env.local          # or paste DATABASE_URL etc. from Neon
pnpm dev
```

> **Warning:** dev, preview and production share one Neon branch, so local runs
> (including `pnpm e2e`) write to production data. Clean up test rows, or give dev
> its own Neon branch.

## Environment

See `.env.example` for comments on each variable.

| Variable | Needed for |
| --- | --- |
| `DATABASE_URL` | Runtime database (Neon pooled URL). |
| `DATABASE_URL_UNPOOLED` | Migrations (direct URL); falls back to `DATABASE_URL`. |
| `KIE_API_KEY` | All generation tools. Without it they return `kie_not_configured`. |
| `MCP_AUTH_TOKEN` | Protects `/api/mcp`. Empty means no auth, for local dev only. |
| `GALLERY_PASSWORD` | Opens `/gallery` and `/projects`. Empty keeps them closed. Changing it signs everyone out. |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Storage. All four are needed; without them tools return KIE's temporary links. |
| `LOG_LEVEL`, `METRICS_PREFIX`, `OTEL_*` | Logging, metrics and tracing. Tracing is off by default. |

## Connect to claude.ai

1. Settings → Connectors → add a custom connector.
2. URL: `https://<your-domain>/api/mcp`.
3. Header: `Authorization: Bearer <MCP_AUTH_TOKEN>` (or `x-api-key: <token>`).
4. Start a new chat with the connector on.

The home page shows the exact endpoint URL with a copy button.

## Scripts

```bash
pnpm dev                 # dev server
pnpm check               # lint + typecheck + unit tests (run for every code change)
pnpm e2e                 # migrate, build, Playwright
pnpm db:generate         # migration from schema changes
pnpm db:migrate          # apply migrations
pnpm db:studio           # Drizzle Studio
pnpm observability:up    # local Grafana + Tempo
pnpm observability:test  # check that traces reach Tempo
pnpm observability:down
```

## Deploy

Production runs on Vercel with the Neon integration, which sets `DATABASE_URL`
and `DATABASE_URL_UNPOOLED`. `/api/mcp` sets `maxDuration = 300` because image
tools wait for KIE.

Docker targets exist too: `runner` for the app and `migrator` for migrations.

```bash
docker build --target runner -t heenzaa-studio .
docker build --target migrator -t heenzaa-studio:migrator .
docker run --rm -e DATABASE_URL_UNPOOLED=postgresql://... heenzaa-studio:migrator
docker run --rm -p 3000:3000 -e DATABASE_URL=postgresql://... heenzaa-studio
```

## Working on it

- `AGENTS.md` is the rulebook: architecture, UI, observability, database, and the
  Safe Change Checklist.
- Every non-trivial change starts with a design doc in `docs/design/`, and every
  change ends with a record in `docs/changes/`. The workflow is described in
  `docs/README.md`.
- New features follow `.claude/skills/add-feature/`.
- A new MCP tool also needs an entry in `toolNames` (`src/content/site.ts`) and
  in both dictionaries. A unit test fails until it is listed.
