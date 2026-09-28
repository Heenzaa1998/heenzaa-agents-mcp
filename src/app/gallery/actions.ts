"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTaskStatus } from "@/features/video-generation/service";
import {
  createSessionToken,
  GALLERY_SESSION_COOKIE,
  GALLERY_SESSION_TTL_MS,
  hasGallerySession,
  verifyGalleryPassword,
} from "@/server/auth/gallery-session";
import { env } from "@/server/env";
import { logger } from "@/server/logger";

export type LoginState = { error: string | null };

// Slows down password guessing; there is no stateful lockout.
const FAILED_LOGIN_DELAY_MS = 1000;

export async function login(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = env.GALLERY_PASSWORD;

  if (!password) {
    return { error: "The gallery is not configured on this server." };
  }

  if (!verifyGalleryPassword(String(formData.get("password") ?? ""), password)) {
    await new Promise((resolve) => setTimeout(resolve, FAILED_LOGIN_DELAY_MS));
    logger.warn({ operation: "gallery_login" }, "Failed gallery login");

    return { error: "Wrong password." };
  }

  const cookieStore = await cookies();

  cookieStore.set(GALLERY_SESSION_COOKIE, createSessionToken(password), {
    httpOnly: true,
    maxAge: GALLERY_SESSION_TTL_MS / 1000,
    path: "/gallery",
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
  });

  redirect("/gallery");
}

export async function logout() {
  const cookieStore = await cookies();

  cookieStore.delete({ name: GALLERY_SESSION_COOKIE, path: "/gallery" });

  redirect("/gallery/login");
}

// Server actions are callable endpoints on their own, so this re-checks the
// session instead of trusting that the page already did.
export async function checkTask(formData: FormData) {
  if (!(await hasGallerySession())) {
    redirect("/gallery/login");
  }

  try {
    await getTaskStatus({ task_id: String(formData.get("taskId") ?? "") });
  } catch (error) {
    logger.warn(
      {
        operation: "gallery_check_task",
        error: error instanceof Error ? error.message : String(error),
      },
      "Gallery task check failed",
    );
  }

  revalidatePath("/gallery");
}
