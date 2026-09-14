import { env } from "@/server/env";
import {
  createPathIgnoreMatcher,
  normalizeTraceIgnorePatterns,
} from "@/server/observability/path-match";

const traceIgnorePatterns = normalizeTraceIgnorePatterns(
  env.OTEL_TRACE_IGNORE_PATHS,
);

function resolveTraceExporterUrl() {
  if (env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) {
    return env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
  }

  return `${env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/$/, "")}/v1/traces`;
}

export const observabilityConfig = {
  metricsPrefix: env.METRICS_PREFIX,
  serviceName: env.OTEL_SERVICE_NAME,
  serviceVersion: env.OTEL_SERVICE_VERSION,
  traceExporterUrl: resolveTraceExporterUrl(),
  traceIgnorePatterns,
  traceSampleRatio: env.OTEL_TRACE_SAMPLE_RATIO,
  tracingEnabled: env.OTEL_TRACING_ENABLED,
  shouldIgnoreTracePath: createPathIgnoreMatcher(traceIgnorePatterns),
} as const;
