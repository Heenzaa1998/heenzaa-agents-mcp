import { spawn } from "node:child_process";
import process from "node:process";

const APP_PORT = 3400;
const APP_URL = `http://127.0.0.1:${APP_PORT}`;
const GRAFANA_URL = "http://127.0.0.1:3001";
const TEMPO_URL = "http://127.0.0.1:3200";
const GRAFANA_AUTH = `Basic ${Buffer.from("admin:admin").toString("base64")}`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

async function waitFor(name, callback, options = {}) {
  const timeoutMs = options.timeoutMs ?? 90_000;
  const intervalMs = options.intervalMs ?? 1_500;
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    try {
      return await callback();
    } catch (error) {
      lastError = error;
      await sleep(intervalMs);
    }
  }

  throw new Error(
    `Timed out waiting for ${name}.${lastError instanceof Error ? ` Last error: ${lastError.message}` : ""}`,
  );
}

function startApp() {
  const child = spawn(
    process.execPath,
    ["./node_modules/next/dist/bin/next", "start", "--port", String(APP_PORT)],
    {
      cwd: process.cwd(),
      env: createSpawnEnv({
        LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
        OTEL_EXPORTER_OTLP_ENDPOINT:
          process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://127.0.0.1:4318",
        OTEL_SERVICE_NAME: process.env.OTEL_SERVICE_NAME ?? "nextjs-drizzle",
        OTEL_SERVICE_VERSION: process.env.OTEL_SERVICE_VERSION ?? "0.1.0",
        OTEL_TRACE_IGNORE_PATHS:
          process.env.OTEL_TRACE_IGNORE_PATHS ?? "/_next/*,/favicon.ico,/metrics",
        OTEL_TRACE_SAMPLE_RATIO: process.env.OTEL_TRACE_SAMPLE_RATIO ?? "1",
        OTEL_TRACING_ENABLED: "true",
      }),
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let stderr = "";

  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  return {
    child,
    getStderr() {
      return stderr.trim();
    },
  };
}

function createSpawnEnv(overrides) {
  return Object.fromEntries(
    Object.entries({
      ...process.env,
      ...overrides,
    })
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)]),
  );
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.text();

  return {
    body,
    json: body ? JSON.parse(body) : null,
    response,
  };
}

function collectSpans(tracePayload) {
  const resourceSpans = tracePayload?.trace?.resourceSpans ?? tracePayload?.resourceSpans ?? [];

  return resourceSpans.flatMap((resourceSpan) => {
    const scopeSpans =
      resourceSpan.scopeSpans ?? resourceSpan.instrumentationLibrarySpans ?? [];

    return scopeSpans.flatMap((scopeSpan) => scopeSpan.spans ?? []);
  });
}

async function waitForTempoTrace(traceId) {
  return waitFor(
    `Tempo trace ${traceId}`,
    async () => {
      const { json, response } = await fetchJson(
        `${TEMPO_URL}/api/v2/traces/${traceId}`,
      );

      assert(response.ok, `Tempo trace lookup failed with ${response.status}.`);

      const spans = collectSpans(json);

      assert(spans.length > 0, `Tempo trace ${traceId} did not contain spans yet.`);

      return json;
    },
    {
      intervalMs: 2_000,
      timeoutMs: 60_000,
    },
  );
}

async function verifyGrafana() {
  await waitFor("Grafana health", async () => {
    const { json, response } = await fetchJson(`${GRAFANA_URL}/api/health`, {
      headers: {
        Authorization: GRAFANA_AUTH,
      },
    });

    assert(response.ok, `Grafana health returned ${response.status}.`);
    assert(json?.database === "ok", "Grafana health payload was not ready.");
  });

  await waitFor("Grafana Tempo datasource", async () => {
    const { json, response } = await fetchJson(
      `${GRAFANA_URL}/api/datasources/uid/tempo`,
      {
        headers: {
          Authorization: GRAFANA_AUTH,
        },
      },
    );

    assert(response.ok, `Grafana datasource lookup returned ${response.status}.`);
    assert(json?.uid === "tempo", "Grafana Tempo datasource is not provisioned.");
  });

  await waitFor("Tempo readiness", async () => {
    const response = await fetch(`${TEMPO_URL}/ready`);

    assert(response.ok, `Tempo readiness returned ${response.status}.`);
  });
}

async function main() {
  await verifyGrafana();

  const app = startApp();

  try {
    await waitFor("application startup", async () => {
      const response = await fetch(`${APP_URL}/api/health`);

      assert(response.ok, `App health returned ${response.status}.`);
    });

    const healthResponse = await fetch(`${APP_URL}/api/health`);
    const healthPayload = await healthResponse.json();
    const healthTraceId = healthResponse.headers.get("x-trace-id");

    assert(healthResponse.ok, "GET /api/health did not succeed.");
    assert(healthPayload.tracing?.enabled === true, "Tracing was not enabled.");
    assert(healthTraceId, "GET /api/health did not expose x-trace-id.");

    const subscriberEmail = `qa-${Date.now()}@example.com`;
    const subscriberResponse = await fetch(`${APP_URL}/api/subscribers`, {
      body: JSON.stringify({
        email: subscriberEmail,
        name: "Jane Example",
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const subscriberPayload = await subscriberResponse.json();
    const subscriberTraceId = subscriberResponse.headers.get("x-trace-id");

    assert(
      subscriberResponse.status === 201,
      `POST /api/subscribers returned ${subscriberResponse.status}.`,
    );
    assert(
      subscriberPayload?.data?.email === subscriberEmail,
      "Subscriber payload was unexpected.",
    );
    assert(subscriberTraceId, "POST /api/subscribers did not expose x-trace-id.");

    const metricsResponse = await fetch(`${APP_URL}/metrics`);
    const metricsBody = await metricsResponse.text();

    assert(metricsResponse.ok, "GET /metrics did not succeed.");
    assert(
      metricsBody.includes("nextjs_drizzle_http_requests_total"),
      "Metrics payload did not include HTTP counters.",
    );
    assert(
      metricsBody.includes("nextjs_drizzle_db_queries_total"),
      "Metrics payload did not include DB counters.",
    );
    assert(
      !metricsResponse.headers.get("x-trace-id"),
      "/metrics should be ignored for tracing but x-trace-id was present.",
    );

    const healthTrace = await waitForTempoTrace(healthTraceId);
    const subscriberTrace = await waitForTempoTrace(subscriberTraceId);

    const healthSpanNames = collectSpans(healthTrace).map((span) => span.name);
    const subscriberSpanNames = collectSpans(subscriberTrace).map((span) => span.name);

    assert(
      healthSpanNames.includes("GET /api/health"),
      "Health trace did not include the route span.",
    );
    assert(
      subscriberSpanNames.includes("POST /api/subscribers"),
      "Subscriber trace did not include the route span.",
    );
    assert(
      subscriberSpanNames.includes("subscribers.create"),
      "Subscriber trace did not include the feature span.",
    );
    assert(
      subscriberSpanNames.includes("db.subscribers.select"),
      "Subscriber trace did not include the SELECT span.",
    );
    assert(
      subscriberSpanNames.includes("db.subscribers.insert"),
      "Subscriber trace did not include the INSERT span.",
    );

    const proxiedTraceResponse = await fetch(
      `${GRAFANA_URL}/api/datasources/proxy/uid/tempo/api/v2/traces/${subscriberTraceId}`,
      {
        headers: {
          Authorization: GRAFANA_AUTH,
        },
      },
    );

    assert(
      proxiedTraceResponse.ok,
      `Grafana proxy could not read the Tempo trace (${proxiedTraceResponse.status}).`,
    );

    console.log("Observability smoke test passed.");
  } finally {
    app.child.kill("SIGTERM");

    await Promise.race([
      new Promise((resolve) => {
        app.child.once("exit", resolve);
      }),
      sleep(5_000),
    ]);

    if (!app.child.killed && app.child.exitCode === null) {
      app.child.kill("SIGKILL");
    }

    if (app.child.exitCode && app.child.exitCode !== 0) {
      throw new Error(
        `App process exited with ${app.child.exitCode}.${app.getStderr() ? ` stderr: ${app.getStderr()}` : ""}`,
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
