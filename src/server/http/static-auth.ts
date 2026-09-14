import { timingSafeEqual } from "node:crypto";
import { env } from "@/server/env";

type RouteHandler = (request: Request) => Promise<Response>;

function extractToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (authorization) {
    const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());

    if (match) {
      return match[1].trim();
    }
  }

  const apiKey = request.headers.get("x-api-key");

  return apiKey ? apiKey.trim() : null;
}

function tokensMatch(provided: string, expected: string): boolean {
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);

  // timingSafeEqual requires equal-length buffers; a length mismatch is itself
  // a non-match, and comparing lengths first does not leak the secret.
  if (providedBytes.length !== expectedBytes.length) {
    return false;
  }

  return timingSafeEqual(providedBytes, expectedBytes);
}

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

// Guards a route handler with a shared static token. When MCP_AUTH_TOKEN is
// unset the handler stays open (authless) for local dev and tests; when set,
// every request must present the token via `Authorization: Bearer <token>` or
// `x-api-key: <token>` — the two header names claude.ai's static_headers beta
// allows without Anthropic review.
export function withStaticAuth(
  handler: RouteHandler,
  token: string | undefined = env.MCP_AUTH_TOKEN,
): RouteHandler {
  return async (request) => {
    if (!token) {
      return handler(request);
    }

    const provided = extractToken(request);

    if (!provided || !tokensMatch(provided, token)) {
      return unauthorized();
    }

    return handler(request);
  };
}
