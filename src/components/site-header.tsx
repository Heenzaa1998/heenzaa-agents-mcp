"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Aperture } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { Dictionary, Locale } from "@/content/i18n";
import { brand, navigationItems } from "@/content/site";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

type SiteHeaderProps = {
  labels: Dictionary["nav"];
  locale: Locale;
};

export function SiteHeader({ labels, locale }: SiteHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link aria-label={brand.name} className="group flex shrink-0 items-center gap-2.5" href="/">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_24px_-4px_var(--primary)] transition-transform duration-500 group-hover:rotate-90">
            <Aperture className="size-4" />
          </span>
          <span className="hidden whitespace-nowrap font-display text-[15px] font-semibold tracking-tight sm:inline">
            {brand.name}
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <nav aria-label="Primary" className="flex items-center gap-1">
            {navigationItems.map((item) => {
              const active = isActive(pathname, item.href);

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-white/[0.08] text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  href={item.href as Route}
                  key={item.href}
                >
                  {labels[item.key]}
                </Link>
              );
            })}
          </nav>
          <LanguageSwitcher label={labels.language} locale={locale} />
        </div>
      </div>
    </header>
  );
}
