import { en, type Dictionary } from "@/content/i18n/en";
import { th } from "@/content/i18n/th";

export const LOCALES = ["th", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "th";
export const LOCALE_COOKIE = "lang";

export const dictionaries: Record<Locale, Dictionary> = { en, th };

export const localeLabels: Record<Locale, string> = { en: "EN", th: "TH" };

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

// Cookie wins; otherwise the first supported language in Accept-Language;
// otherwise Thai, the owner's language.
export function resolveLocale(
  cookieValue: string | undefined,
  acceptLanguage: string | null | undefined,
): Locale {
  if (isLocale(cookieValue)) {
    return cookieValue;
  }

  for (const part of (acceptLanguage ?? "").split(",")) {
    const primary = part.split(";")[0]?.trim().toLowerCase().split("-")[0];

    if (isLocale(primary)) {
      return primary;
    }
  }

  return DEFAULT_LOCALE;
}

export type { Dictionary };
