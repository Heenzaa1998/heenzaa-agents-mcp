"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isLocale, LOCALE_COOKIE } from "@/content/i18n";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function setLocale(formData: FormData) {
  const locale = formData.get("locale");

  if (!isLocale(locale)) {
    return;
  }

  const cookieStore = await cookies();

  cookieStore.set(LOCALE_COOKIE, locale, {
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
}
