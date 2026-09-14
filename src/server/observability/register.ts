import { URL } from "node:url";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  BatchSpanProcessor,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-base";
import { env } from "@/server/env";
import { observabilityConfig } from "@/server/observability/config";

const exporterUrl = new URL(observabilityConfig.traceExporterUrl);

function resolveIncomingPath(url: string | null | undefined) {
  if (!url) {
    return "/";
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return new URL(url).pathname;
  }

  return new URL(url, "http://127.0.0.1").pathname;
}

function isExporterRequest(
  hostname: string | null | undefined,
  path: string | null | undefined,
  port: number | string | null | undefined,
) {
  const normalizedPort =
    typeof port === "number"
      ? String(port)
      : typeof port === "string" && port.length > 0
        ? port
        : exporterUrl.port ||
          (exporterUrl.protocol === "https:" ? "443" : "80");

  return (
    hostname === exporterUrl.hostname &&
    normalizedPort ===
      (exporterUrl.port || (exporterUrl.protocol === "https:" ? "443" : "80")) &&
    path?.startsWith(exporterUrl.pathname) === true
  );
}

const globalForTelemetry = globalThis as typeof globalThis & {
  __otelSdk?: NodeSDK;
  __otelShutdownBound?: boolean;
};

export async function registerTelemetry() {
  if (!observabilityConfig.tracingEnabled) {
    return;
  }

  if (globalForTelemetry.__otelSdk) {
    return;
  }

  const exporter = new OTLPTraceExporter({
    url: observabilityConfig.traceExporterUrl,
  });

  const sdk = new NodeSDK({
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-dns": { enabled: false },
        "@opentelemetry/instrumentation-fs": { enabled: false },
        "@opentelemetry/instrumentation-http": {
          headersToSpanAttributes: {
            server: {
              requestHeaders: ["x-request-id"],
            },
          },
          ignoreIncomingRequestHook(request) {
            return observabilityConfig.shouldIgnoreTracePath(
              resolveIncomingPath(request.url),
            );
          },
          ignoreOutgoingRequestHook(request) {
            return isExporterRequest(request.hostname, request.path, request.port);
          },
        },
        "@opentelemetry/instrumentation-net": { enabled: false },
      }),
    ],
    resource: resourceFromAttributes({
      "deployment.environment.name": env.NODE_ENV,
      "service.name": observabilityConfig.serviceName,
      "service.version": observabilityConfig.serviceVersion,
    }),
    sampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(observabilityConfig.traceSampleRatio),
    }),
    spanProcessors: [new BatchSpanProcessor(exporter)],
  });

  await Promise.resolve(sdk.start());

  globalForTelemetry.__otelSdk = sdk;

  if (globalForTelemetry.__otelShutdownBound) {
    return;
  }

  const shutdown = async () => {
    await globalForTelemetry.__otelSdk?.shutdown();
    globalForTelemetry.__otelSdk = undefined;
  };

  process.once("SIGINT", () => {
    void shutdown();
  });

  process.once("SIGTERM", () => {
    void shutdown();
  });

  globalForTelemetry.__otelShutdownBound = true;
}
