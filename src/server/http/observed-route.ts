import { randomUUID } from "node:crypto";
import { SpanStatusCode, type Span } from "@opentelemetry/api";
import { logger } from "@/server/observability/logger";
import { recordHttpRequest } from "@/server/observability/metrics";
import { runWithRequestContext } from "@/server/observability/request-context";
import { getActiveTraceContext, withSpan } from "@/server/observability/tracing";
import { observabilityConfig } from "@/server/observability/config";
import { toErrorResponse } from "@/server/http/error-response";

type RouteHandler = (request: Request) => Promise<Response>;

type ObserveRouteOptions = {
  method: string;
  route: string;
};

export function observeRoute(
  options: ObserveRouteOptions,
  handler: RouteHandler,
): RouteHandler {
  return async function observedRoute(request: Request) {
    const startedAt = performance.now();
    const requestUrl = new URL(request.url);
    const requestId = request.headers.get("x-request-id") ?? randomUUID();
    const shouldTrace =
      observabilityConfig.tracingEnabled &&
      !observabilityConfig.shouldIgnoreTracePath(requestUrl.pathname);

    return runWithRequestContext(
      {
        method: options.method,
        pathname: requestUrl.pathname,
        requestId,
        route: options.route,
      },
      async () => {
        let response: Response;
        let traceId = shouldTrace ? getActiveTraceContext()?.traceId : undefined;

        if (shouldTrace) {
          response = await withSpan(
            `${options.method} ${options.route}`,
            {
              attributes: {
                "http.request.method": options.method,
                "http.route": options.route,
                "url.path": requestUrl.pathname,
              },
            },
            async (span) => {
              traceId = span.spanContext().traceId;
              return executeHandler(span, handler, options, request);
            },
          );
        } else {
          response = await executeHandler(null, handler, options, request);
        }

        response.headers.set("x-request-id", requestId);

        if (shouldTrace && traceId) {
          response.headers.set("x-trace-id", traceId);
        }

        const durationSeconds = (performance.now() - startedAt) / 1000;

        recordHttpRequest({
          durationSeconds,
          method: options.method,
          route: options.route,
          statusCode: response.status,
        });

        logger.info(
          {
            duration_ms: Number((durationSeconds * 1000).toFixed(1)),
            status_code: response.status,
            traced: shouldTrace,
          },
          "Request handled",
        );

        return response;
      },
    );
  };
}

async function executeHandler(
  span: Span | null,
  handler: RouteHandler,
  options: ObserveRouteOptions,
  request: Request,
) {
  try {
    const response = await handler(request);

    finalizeSpan(span, response);

    return response;
  } catch (error) {
    const errorResponse = toErrorResponse(error, {
      method: options.method,
      path: options.route,
    });

    finalizeSpan(span, errorResponse, error);

    return errorResponse;
  }
}

function finalizeSpan(span: Span | null, response: Response, error?: unknown) {
  if (!span) {
    return;
  }

  span.setAttribute("http.response.status_code", response.status);

  if (error) {
    span.recordException(error instanceof Error ? error : { message: String(error) });
  }

  if (response.status >= 400) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : `HTTP ${response.status}`,
    });

    return;
  }

  span.setStatus({ code: SpanStatusCode.OK });
}
