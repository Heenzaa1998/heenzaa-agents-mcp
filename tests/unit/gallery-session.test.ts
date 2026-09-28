// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  GALLERY_SESSION_TTL_MS,
  isGalleryEnabled,
  verifyGalleryPassword,
  verifySessionToken,
} from "@/server/auth/gallery-session";

const password = "correct horse battery staple";
const now = 1_790_000_000_000;

describe("verifyGalleryPassword", () => {
  it("accepts the configured password and rejects anything else", () => {
    expect(verifyGalleryPassword(password, password)).toBe(true);
    expect(verifyGalleryPassword("wrong", password)).toBe(false);
    expect(verifyGalleryPassword("", password)).toBe(false);
  });

  it("rejects everything when no password is configured", () => {
    expect(isGalleryEnabled(undefined)).toBe(false);
    expect(verifyGalleryPassword("", undefined)).toBe(false);
  });
});

describe("session tokens", () => {
  it("verifies a fresh token", () => {
    const token = createSessionToken(password, now);

    expect(verifySessionToken(token, password, now + 1000)).toBe(true);
  });

  it("rejects an expired token", () => {
    const token = createSessionToken(password, now);

    expect(verifySessionToken(token, password, now + GALLERY_SESSION_TTL_MS + 1)).toBe(
      false,
    );
  });

  it("rejects a token after the password changes", () => {
    const token = createSessionToken(password, now);

    expect(verifySessionToken(token, "a new password", now)).toBe(false);
  });

  it("rejects a token with a pushed-out expiry", () => {
    const [, signature] = createSessionToken(password, now).split(".");
    const forged = `${now + 10 * GALLERY_SESSION_TTL_MS}.${signature}`;

    expect(verifySessionToken(forged, password, now)).toBe(false);
  });

  it.each([undefined, "", "garbage", "123", "abc.def", "1.2.3"])(
    "rejects malformed token %s",
    (token) => {
      expect(verifySessionToken(token, password, now)).toBe(false);
    },
  );

  it("rejects every token when no password is configured", () => {
    const token = createSessionToken(password, now);

    expect(verifySessionToken(token, undefined, now)).toBe(false);
  });
});
