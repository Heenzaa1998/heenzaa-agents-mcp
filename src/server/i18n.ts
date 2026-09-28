import { cookies, headers } from "next/headers";
import {
  dictionaries,
  LOCALE_COOKIE,
  resolveLocale,
  type Dictionary,
  type Locale,
} from "@/content/i18n";

export async function getLocale(): Promise<Locale> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);

  return resolveLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    headerList.get("accept-language"),
  );
}

export async function getDictionary(): Promise<{ locale: Locale; dict: Dictionary }> {
  const locale = await getLocale();

  return { locale, dict: dictionaries[locale] };
}
