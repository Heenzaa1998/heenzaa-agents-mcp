import { setLocale } from "@/app/i18n-actions";
import { LOCALES, localeLabels, type Locale } from "@/content/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  return (
    <form
      action={setLocale}
      aria-label={label}
      className="flex rounded-full border border-border/80 bg-card/60 p-0.5 backdrop-blur"
    >
      {LOCALES.map((option) => (
        <button
          aria-pressed={option === locale}
          className={cn(
            "rounded-full px-2.5 py-1 font-mono text-[11px] font-medium transition-colors",
            option === locale
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
          key={option}
          name="locale"
          type="submit"
          value={option}
        >
          {localeLabels[option]}
        </button>
      ))}
    </form>
  );
}
