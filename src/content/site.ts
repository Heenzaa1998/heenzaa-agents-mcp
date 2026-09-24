import packageJson from "../../package.json";

const dependencies = packageJson.dependencies ?? {};
const devDependencies = packageJson.devDependencies ?? {};

export const navigationItems = [
  {
    href: "/",
    label: "Overview",
    summary: "What the template includes and how the pieces fit together.",
  },
  {
    href: "/guide",
    label: "Guide",
    summary: "How to use the project once the app is running for real work.",
  },
  {
    href: "/operations",
    label: "Operations",
    summary: "Runbook for health checks, metrics, logs, and tracing in production.",
  },
] as const;

export const stackItems = [
  {
    name: "Next.js",
    version: dependencies.next ?? "n/a",
    detail: "App Router, route handlers, instrumentation, and proxy entrypoints.",
  },
  {
    name: "Tailwind CSS",
    version: devDependencies.tailwindcss ?? "n/a",
    detail: "Tailwind v4 tokens with a light shadcn/ui layer for durable UI work.",
  },
  {
    name: "shadcn/ui",
    version: devDependencies.shadcn ?? "n/a",
    detail: "Composable components kept in-repo instead of hiding logic in a package.",
  },
  {
    name: "Zod",
    version: dependencies.zod ?? "n/a",
    detail: "Shared contracts for env parsing, request payloads, and feature boundaries.",
  },
  {
    name: "Drizzle ORM",
    version: dependencies["drizzle-orm"] ?? "n/a",
    detail: "Typed SQL access with generated migrations outside runtime source code.",
  },
  {
    name: "OpenTelemetry",
    version: dependencies["@opentelemetry/sdk-node"] ?? "n/a",
    detail: "Root tracing, nested feature spans, and OTLP export to Grafana Tempo.",
  },
  {
    name: "prom-client",
    version: dependencies["prom-client"] ?? "n/a",
    detail: "Process, HTTP, and database metrics exposed at /metrics.",
  },
  {
    name: "Vitest",
    version: devDependencies.vitest ?? "n/a",
    detail: "Fast unit coverage around contracts, services, and observability helpers.",
  },
  {
    name: "Playwright",
    version: devDependencies["@playwright/test"] ?? "n/a",
    detail: "Browser checks for the site, subscriber flow, and API smoke routes.",
  },
] as const;

export const scripts = [
  {
    name: "pnpm check",
    detail: "Run linting, type checks, and unit tests in one pass.",
  },
  {
    name: "pnpm e2e",
    detail: "Migrate the local database, build the app, and run Playwright.",
  },
  {
    name: "pnpm observability:up",
    detail: "Boot Grafana and Tempo locally with ready-to-use provisioning.",
  },
  {
    name: "pnpm observability:test",
    detail: "Start the stack, run the app, and verify spans reach Tempo.",
  },
  {
    name: "pnpm db:migrate",
    detail: "Apply committed migrations to the configured database.",
  },
  {
    name: "pnpm dev",
    detail: "Start the local development server with the current configuration.",
  },
] as const;

export const architectureLayers = [
  {
    path: "src/app",
    detail: "Route entrypoints, page composition, and thin HTTP adapters only.",
  },
  {
    path: "src/features",
    detail: "Business rules, validation contracts, and repositories grouped by domain.",
  },
  {
    path: "src/server",
    detail: "Env parsing, observability, db wiring, and generic HTTP utilities.",
  },
  {
    path: "src/components",
    detail: "Reusable UI primitives and client components that stay close to the app.",
  },
  {
    path: "drizzle",
    detail: "Generated SQL migrations kept outside src for cleaner runtime code.",
  },
  {
    path: "ops",
    detail: "Local Grafana and Tempo provisioning for observability smoke tests.",
  },
] as const;

export const operatingPrinciples = [
  "Keep App Router files thin: parse the request, call a feature service, return a stable response.",
  "Create spans at route, service, and repository boundaries so tracing stays useful without exploding cardinality.",
  "Log with request and trace IDs by default so production incidents can be correlated quickly.",
  "Prefer one shallow server layer for infra concerns instead of enterprise-style abstractions for every file.",
] as const;

export const bootstrapSteps = [
  "Copy .env.example to .env.local and decide whether OTEL tracing should be on for your environment.",
  "Run pnpm observability:up when you want Grafana Tempo available locally.",
  "Pull DATABASE_URL for your Neon Postgres database, then run pnpm db:migrate before feature work.",
  "Use pnpm observability:test to verify traces, metrics, and middleware wiring end-to-end.",
] as const;

export const observabilityChecklist = [
  "Structured JSON logging with request IDs and active trace IDs.",
  "Prometheus-compatible metrics for Node.js, HTTP routes, and database operations.",
  "OpenTelemetry spans that flow from route handlers into services and repositories.",
  "Configurable ignore paths so noise like /metrics or static assets do not flood tracing.",
] as const;

export const liveRoutes = [
  {
    audience: "Everyone",
    method: "GET",
    path: "/",
    summary: "Overview page that introduces the stack, architecture, and sample feature flow.",
  },
  {
    audience: "Developers",
    method: "GET",
    path: "/guide",
    summary: "Onboarding page for commands, routes, extension points, and project structure.",
  },
  {
    audience: "Operators",
    method: "GET",
    path: "/operations",
    summary: "Runbook page for health checks, metrics, logs, traces, and Tempo usage.",
  },
  {
    audience: "Load balancers / probes",
    method: "GET",
    path: "/api/health",
    summary: "Health JSON with app name, active database mode, and tracing configuration.",
  },
  {
    audience: "Prometheus / SRE",
    method: "GET",
    path: "/metrics",
    summary: "Metrics exposition for route counters, process metrics, and database timings.",
  },
  {
    audience: "Feature smoke tests",
    method: "POST",
    path: "/api/subscribers",
    summary: "Real sample workflow using Zod validation, Drizzle persistence, and tracing.",
  },
] as const;

export const deploymentChecklist = [
  "Run pnpm db:migrate as part of deploy so schema changes land before traffic.",
  "Set OTEL_EXPORTER_OTLP_ENDPOINT to your collector or Tempo gateway before enabling tracing.",
  "Decide which paths should stay out of traces through OTEL_TRACE_IGNORE_PATHS.",
  "Protect /metrics according to your platform policy if the app is internet-facing.",
  "Keep request IDs in logs and make sure your log pipeline preserves them.",
  "Treat /api/subscribers as a sample feature and replace it with your own domain flows over time.",
] as const;

export const requestJourney = [
  {
    detail: "A browser or API client loads a page or posts JSON to a route handler.",
    step: "Entry point",
  },
  {
    detail: "The App Router file parses input, starts the route span, and delegates immediately.",
    step: "Route adapter",
  },
  {
    detail: "A feature service applies rules and emits a business-level span with stable names.",
    step: "Service boundary",
  },
  {
    detail: "A repository performs the Drizzle query and records database timing in child spans.",
    step: "Repository and DB",
  },
  {
    detail: "Logs, metrics, and traces are emitted together so the request can be reconstructed later.",
    step: "Observability trail",
  },
] as const;

export const monitoringSignals = [
  {
    detail: "Route counters and durations are exposed through prom-client at /metrics.",
    title: "HTTP metrics",
  },
  {
    detail: "Pino logs include request IDs and active trace IDs for correlation during incidents.",
    title: "Structured logs",
  },
  {
    detail: "Route, service, repository, and DB spans are exported through OTLP into Tempo.",
    title: "Distributed traces",
  },
  {
    detail: "The sample subscriber feature proves DB spans sit under the same parent request trace.",
    title: "Database visibility",
  },
] as const;

export const operatorRunbook = [
  {
    detail: "Call /api/health first. It confirms the app is reachable, shows the database mode, and tells you whether tracing is enabled.",
    label: "1. Check health",
  },
  {
    detail: "Open /metrics or your Prometheus target and look for route counters, latency, and DB-related measurements before digging deeper.",
    label: "2. Check metrics",
  },
  {
    detail: "Use request IDs or trace IDs in logs to identify the exact request window that matters.",
    label: "3. Correlate logs",
  },
  {
    detail: "Open Tempo and follow the request from route span to service span to repository span so slow points are visible in one tree.",
    label: "4. Inspect traces",
  },
] as const;

export const localObservabilityEndpoints = [
  {
    label: "Grafana",
    url: "http://127.0.0.1:3001",
  },
  {
    label: "Tempo API",
    url: "http://127.0.0.1:3200",
  },
  {
    label: "OTLP HTTP",
    url: "http://127.0.0.1:4318",
  },
] as const;

export const traceExample = `incoming request
  -> app.route span
  -> subscribers.create span
  -> db.subscribers.select span
  -> db.subscribers.insert span`;

export const ignorePathsExample =
  "/metrics,_next/static,_next/image,favicon.ico";
