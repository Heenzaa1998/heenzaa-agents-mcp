import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";
import { observabilityConfig } from "@/server/observability/config";

type HttpLabels = "method" | "route" | "status_code";
type DatabaseLabels = "operation" | "outcome" | "table";

type MetricsStore = {
  databaseQueryDuration: Histogram<DatabaseLabels>;
  databaseQueriesTotal: Counter<DatabaseLabels>;
  httpRequestDuration: Histogram<HttpLabels>;
  httpRequestsTotal: Counter<HttpLabels>;
  registry: Registry;
};

function metricName(name: string) {
  return `${observabilityConfig.metricsPrefix}${name}`;
}

function createMetricsStore(): MetricsStore {
  const registry = new Registry();

  collectDefaultMetrics({
    prefix: observabilityConfig.metricsPrefix,
    register: registry,
  });

  const httpRequestsTotal = new Counter<HttpLabels>({
    help: "Total number of handled HTTP requests.",
    labelNames: ["method", "route", "status_code"],
    name: metricName("http_requests_total"),
    registers: [registry],
  });

  const httpRequestDuration = new Histogram<HttpLabels>({
    buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    help: "HTTP request duration in seconds.",
    labelNames: ["method", "route", "status_code"],
    name: metricName("http_request_duration_seconds"),
    registers: [registry],
  });

  const databaseQueriesTotal = new Counter<DatabaseLabels>({
    help: "Total number of database operations.",
    labelNames: ["operation", "outcome", "table"],
    name: metricName("db_queries_total"),
    registers: [registry],
  });

  const databaseQueryDuration = new Histogram<DatabaseLabels>({
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5],
    help: "Database operation duration in seconds.",
    labelNames: ["operation", "outcome", "table"],
    name: metricName("db_query_duration_seconds"),
    registers: [registry],
  });

  return {
    databaseQueryDuration,
    databaseQueriesTotal,
    httpRequestDuration,
    httpRequestsTotal,
    registry,
  };
}

const globalForMetrics = globalThis as typeof globalThis & {
  __metricsStore?: MetricsStore;
};

export const metricsStore = globalForMetrics.__metricsStore ?? createMetricsStore();

if (process.env.NODE_ENV !== "production") {
  globalForMetrics.__metricsStore = metricsStore;
}

export function recordHttpRequest({
  durationSeconds,
  method,
  route,
  statusCode,
}: {
  durationSeconds: number;
  method: string;
  route: string;
  statusCode: number;
}) {
  const labels = {
    method,
    route,
    status_code: String(statusCode),
  } as const;

  metricsStore.httpRequestsTotal.inc(labels);
  metricsStore.httpRequestDuration.observe(labels, durationSeconds);
}

export function recordDatabaseOperation({
  durationSeconds,
  operation,
  outcome,
  table,
}: {
  durationSeconds: number;
  operation: string;
  outcome: "error" | "ok";
  table: string;
}) {
  const labels = {
    operation,
    outcome,
    table,
  } as const;

  metricsStore.databaseQueriesTotal.inc(labels);
  metricsStore.databaseQueryDuration.observe(labels, durationSeconds);
}

export async function renderMetrics() {
  return metricsStore.registry.metrics();
}
