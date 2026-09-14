import { describe, expect, it } from "vitest";
import {
  createPathIgnoreMatcher,
  normalizeTraceIgnorePatterns,
  shouldIgnoreTracePath,
} from "@/server/observability/path-match";

describe("trace path matching", () => {
  it("normalizes comma-separated ignore paths", () => {
    expect(normalizeTraceIgnorePatterns("metrics,/favicon.ico, /_next/*")).toEqual([
      "/metrics",
      "/favicon.ico",
      "/_next/*",
    ]);
  });

  it("supports wildcard matches", () => {
    const shouldIgnore = createPathIgnoreMatcher(["/_next/*", "/metrics"]);

    expect(shouldIgnore("/_next/static/chunk.js")).toBe(true);
    expect(shouldIgnore("/metrics")).toBe(true);
    expect(shouldIgnore("/api/health")).toBe(false);
  });

  it("can evaluate a raw env string directly", () => {
    expect(shouldIgnoreTracePath("/metrics", "/metrics,/favicon.ico")).toBe(true);
    expect(shouldIgnoreTracePath("/api/health", "/metrics,/favicon.ico")).toBe(false);
  });
});
