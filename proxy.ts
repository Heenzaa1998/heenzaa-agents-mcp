import { NextResponse, type NextRequest } from "next/server";
import {
  createPathIgnoreMatcher,
  normalizeTraceIgnorePatterns,
} from "./src/server/observability/path-match";

const shouldIgnoreTracePath = createPathIgnoreMatcher(
  normalizeTraceIgnorePatterns(process.env.OTEL_TRACE_IGNORE_PATHS),
);

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set(
    "x-trace-ignored",
    shouldIgnoreTracePath(request.nextUrl.pathname) ? "1" : "0",
  );

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("x-request-id", requestId);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
