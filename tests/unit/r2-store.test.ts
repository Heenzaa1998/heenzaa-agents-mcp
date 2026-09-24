// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { createR2Store, PRESIGN_TTL_SECONDS } from "@/server/storage/r2";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createR2Store", () => {
  it("is disabled when any setting is missing", () => {
    const store = createR2Store({
      accountId: "acct",
      accessKeyId: "id",
      bucket: "media",
    });

    expect(store.enabled).toBe(false);
  });

  it("presigns a GET URL for the object without network access", async () => {
    const store = createR2Store({
      accountId: "acct123",
      accessKeyId: "AKID",
      secretAccessKey: "secret",
      bucket: "media",
    });

    const url = new URL(await store.presign("images/task_1-1.png"));

    expect(url.host).toBe("acct123.r2.cloudflarestorage.com");
    expect(url.pathname).toBe("/media/images/task_1-1.png");
    expect(url.searchParams.get("X-Amz-Expires")).toBe(String(PRESIGN_TTL_SECONDS));
    expect(url.searchParams.get("X-Amz-Credential")).toContain("AKID/");
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("uploads the raw bytes so the request carries a Content-Length", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const store = createR2Store({
      accountId: "acct123",
      accessKeyId: "AKID",
      secretAccessKey: "secret",
      bucket: "media",
    });
    const body = new Uint8Array([1, 2, 3]).buffer;

    await store.put("images/task_1-1.png", body, "image/png");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe(
      "https://acct123.r2.cloudflarestorage.com/media/images/task_1-1.png",
    );
    expect(init.method).toBe("PUT");
    // The original buffer (not a stream) lets fetch compute Content-Length.
    expect(init.body).toBe(body);
    expect(new Headers(init.headers).get("authorization")).toMatch(
      /^AWS4-HMAC-SHA256 /,
    );
  });
});
