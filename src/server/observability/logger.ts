import pino from "pino";
import { env } from "@/server/env";
import { getRequestContext } from "@/server/observability/request-context";
import { getActiveTraceContext } from "@/server/observability/tracing";

const transport =
  env.NODE_ENV === "development"
    ? {
        options: {
          colorize: true,
          ignore: "pid,hostname",
          translateTime: "SYS:standard",
        },
        target: "pino-pretty",
      }
    : undefined;

export const logger = pino({
  base: {
    app: env.APP_NAME,
    service: env.OTEL_SERVICE_NAME,
  },
  level: env.LOG_LEVEL,
  mixin() {
    const requestContext = getRequestContext();
    const traceContext = getActiveTraceContext();

    return {
      method: requestContext?.method,
      pathname: requestContext?.pathname,
      requestId: requestContext?.requestId,
      route: requestContext?.route,
      spanId: traceContext?.spanId,
      traceId: traceContext?.traceId,
    };
  },
  transport,
});
