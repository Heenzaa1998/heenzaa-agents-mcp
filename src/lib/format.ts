import type { Locale } from "@/content/i18n";

const numberLocale = (locale: Locale) => (locale === "th" ? "th-TH" : "en-US");

export function formatBaht(amount: number, locale: Locale) {
  return new Intl.NumberFormat(numberLocale(locale), {
    style: "currency",
    currency: "THB",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCredits(credits: number, locale: Locale) {
  return new Intl.NumberFormat(numberLocale(locale), { maximumFractionDigits: 2 }).format(credits);
}
