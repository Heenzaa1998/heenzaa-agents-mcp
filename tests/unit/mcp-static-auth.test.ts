import { describe, expect, it, vi } from "vitest";
import { withStaticAuth } from "@/server/http/static-auth";

function makeRequest(headers: Record<string, string> = {}) {
  return new Request("https://example.com/api/mcp", { method: "POST", headers });
}

describe("withStaticAuth", () => {
  it("passes through when no token is configured", async () => {
    const handler = vi.fn().mockResolvedValue(new Response("ok"));

    const response = await withStaticAuth(handler, undefined)(makeRequest());

    expect(handler).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
  });

  it("rejects a request with no token when one is configured", async () => {
    const handler = vi.fn().mockResolvedValue(new Response("ok"));

    const response = await withStaticAuth(handler, "secret-token")(makeRequest());

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
  });

  it("rejects a wrong token", async () => {
    const handler = vi.fn().mockResolvedValue(new Response("ok"));

    const response = await withStaticAuth(handler, "secret-token")(
      makeRequest({ authorization: "Bearer wrong" }),
    );

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
  });

  it("accepts the correct token via Authorization Bearer", async () => {
    const handler = vi.fn().mockResolvedValue(new Response("ok"));

    const response = await withStaticAuth(handler, "secret-token")(
      makeRequest({ authorization: "Bearer secret-token" }),
    );

    expect(handler).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
  });

  it("accepts the correct token via x-api-key", async () => {
    const handler = vi.fn().mockResolvedValue(new Response("ok"));

    const response = await withStaticAuth(handler, "secret-token")(
      makeRequest({ "x-api-key": "secret-token" }),
    );

    expect(handler).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
  });
});
