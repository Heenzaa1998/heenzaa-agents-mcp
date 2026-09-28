import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/server/env";

// Site-wide (path "/") because /projects needs it too. Renamed from
// "gallery_session", which was scoped to /gallery, so old cookies are ignored.
export const GALLERY_SESSION_COOKIE = "studio_session";
export const GALLERY_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function sha256(value: string) {
  return createHash("sha256").update(value).digest();
}

// The signing key is derived from the password itself, so changing
// GALLERY_PASSWORD invalidates every existing session without a second secret.
function signingKey(password: string) {
  return sha256(`gallery-session-key:${password}`);
}

function signature(password: string, expiresAt: number) {
  return createHmac("sha256", signingKey(password))
    .update(`gallery-session:${expiresAt}`)
    .digest("hex");
}

function safeEqual(a: Buffer, b: Buffer) {
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isGalleryEnabled(password = env.GALLERY_PASSWORD) {
  return Boolean(password);
}

export function verifyGalleryPassword(
  input: string,
  password = env.GALLERY_PASSWORD,
): boolean {
  if (!password) {
    return false;
  }

  // Hash both sides so the comparison is constant-time regardless of length.
  return safeEqual(sha256(input), sha256(password));
}

export function createSessionToken(password: string, now = Date.now()) {
  const expiresAt = now + GALLERY_SESSION_TTL_MS;

  return `${expiresAt}.${signature(password, expiresAt)}`;
}

export function verifySessionToken(
  token: string | undefined,
  password = env.GALLERY_PASSWORD,
  now = Date.now(),
): boolean {
  if (!token || !password) {
    return false;
  }

  const [expiresRaw, provided, ...rest] = token.split(".");
  const expiresAt = Number(expiresRaw);

  if (rest.length > 0 || !provided || !Number.isSafeInteger(expiresAt) || expiresAt <= now) {
    return false;
  }

  return safeEqual(
    Buffer.from(provided),
    Buffer.from(signature(password, expiresAt)),
  );
}

export async function hasGallerySession() {
  const cookieStore = await cookies();

  return verifySessionToken(cookieStore.get(GALLERY_SESSION_COOKIE)?.value);
}

// For pages and server actions that show or change private data.
export async function requireGallerySession() {
  if (!isGalleryEnabled() || !(await hasGallerySession())) {
    redirect("/gallery/login");
  }
}
