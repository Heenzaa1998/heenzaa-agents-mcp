import {
  SpanKind,
  SpanStatusCode,
  type Attributes,
  type Span,
  type SpanOptions,
  trace,
} from "@opentelemetry/api";
import { recordDatabaseOperation } from "@/server/observability/metrics";

type SpanCallback<T> = (span: Span) => Promise<T> | T;

type DatabaseSpanOptions = {
  operation: string;
  summary: string;
  table: string;
};

const tracer = trace.getTracer("nextjs-drizzle.app");

export async function withSpan<T>(
  name: string,
  options: SpanOptions,
  callback: SpanCallback<T>,
) {
  return tracer.startActiveSpan(name, options, async (span) => {
    try {
      return await callback(span);
    } catch (error) {
      recordException(span, error);
      throw error;
    } finally {
      span.end();
    }
  });
}

export async function withDatabaseSpan<T>(
  options: DatabaseSpanOptions,
  callback: SpanCallback<T>,
) {
  const startedAt = performance.now();
  let outcome: "error" | "ok" = "ok";

  try {
    return await withSpan(
      `db.${options.table}.${options.operation.toLowerCase()}`,
      {
        attributes: {
          "db.collection.name": options.table,
          "db.operation.name": options.operation,
          "db.query.summary": options.summary,
          "db.system.name": "postgresql",
        },
        kind: SpanKind.CLIENT,
      },
      async (span) => {
        const result = await callback(span);

        span.setStatus({ code: SpanStatusCode.OK });

        return result;
      },
    );
  } catch (error) {
    outcome = "error";

    throw error;
  } finally {
    recordDatabaseOperation({
      durationSeconds: millisecondsToSeconds(performance.now() - startedAt),
      operation: options.operation,
      outcome,
      table: options.table,
    });
  }
}

export function getActiveTraceContext() {
  const activeSpan = trace.getActiveSpan();

  if (!activeSpan) {
    return null;
  }

  const spanContext = activeSpan.spanContext();

  return {
    spanId: spanContext.spanId,
    traceId: spanContext.traceId,
  };
}

export function markSpanOk(span: Span, attributes?: Attributes) {
  if (attributes) {
    span.setAttributes(attributes);
  }

  span.setStatus({ code: SpanStatusCode.OK });
}

export function recordException(span: Span, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";

  if (error instanceof Error) {
    span.recordException(error);
  } else {
    span.recordException({ message });
  }

  span.setStatus({
    code: SpanStatusCode.ERROR,
    message,
  });
}

function millisecondsToSeconds(durationMilliseconds: number) {
  return durationMilliseconds / 1000;
}
