import type { Metadata, Route } from "next";
import Link from "next/link";
import { after } from "next/server";
import { ArrowRight, Coins, FolderOpen, Inbox, Wallet } from "lucide-react";
import { saveCreditRate } from "@/app/projects/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Dictionary, Locale } from "@/content/i18n";
import {
  backfillCosts,
  getCreditBalance,
  getCreditRate,
  listProjectReports,
  toBaht,
  type ProjectReport,
} from "@/features/projects/service";
import { requireGallerySession } from "@/server/auth/gallery-session";
import { getDictionary } from "@/server/i18n";
import { formatBaht, formatCredits } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();

  return { title: dict.projects.title, robots: { index: false, follow: false } };
}

function ReportCard({
  dict,
  locale,
  rate,
  report,
}: {
  dict: Dictionary;
  locale: Locale;
  rate: number;
  report: ProjectReport;
}) {
  const text = dict.projects;
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/[0.06] text-primary">
            {report.project ? <FolderOpen className="size-4" /> : <Inbox className="size-4" />}
          </span>
          <h2 className="font-display text-lg font-semibold tracking-tight">
            {report.project?.name ?? text.unassigned}
          </h2>
        </div>
        {report.project ? (
          <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
        ) : null}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-display text-3xl font-semibold tracking-tight">
          {formatBaht(toBaht(report.credits, rate), locale)}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatCredits(report.credits, locale)} {dict.gallery.credits}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-white/[0.06] pt-4 text-xs text-muted-foreground">
        <span>
          {text.takes(report.takes)} · {text.failed(report.failed)}
        </span>
        <span>{text.clipsUsed(report.clipsUsed, report.usedSeconds)}</span>
        {report.creditsPerUsedSecond !== null ? (
          <span className="text-foreground">
            {formatBaht(toBaht(report.creditsPerUsedSecond, rate), locale)} {text.perUsedSecond}
          </span>
        ) : null}
      </div>

      {report.unknownCredits > 0 ? (
        <p className="text-xs text-warning">{text.unknownCredits(report.unknownCredits)}</p>
      ) : null}
      {!report.project ? <p className="text-xs text-muted-foreground">{text.unassignedBody}</p> : null}
    </>
  );
  const className =
    "glass group flex flex-col gap-5 rounded-2xl p-6 transition-colors";

  return report.project ? (
    <Link className={`${className} hover:border-primary/40`} href={`/projects/${report.project.id}` as Route}>
      {body}
    </Link>
  ) : (
    <Link className={`${className} hover:border-white/20`} href={"/gallery" as Route}>
      {body}
    </Link>
  );
}

export default async function ProjectsPage() {
  await requireGallerySession();

  const [{ dict, locale }, reports, rate, balance] = await Promise.all([
    getDictionary(),
    listProjectReports(),
    getCreditRate(),
    getCreditBalance(),
  ]);
  const text = dict.projects;

  if (reports.some((report) => report.unknownCredits > 0)) {
    // Ask KIE for costs of older work once the page has been sent.
    after(() => backfillCosts());
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-10 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-5xl font-semibold tracking-[-0.045em]">
          <span className="text-gradient">{text.title}</span>
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{text.intro}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass flex items-center gap-4 rounded-2xl p-6">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_30px_-8px_var(--primary)]">
            <Wallet className="size-5" />
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{text.balance}</span>
            {balance === null ? (
              <span className="text-sm text-warning">{text.balanceUnknown}</span>
            ) : (
              <span className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-semibold tracking-tight">
                  {formatCredits(balance, locale)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {dict.gallery.credits} ≈ {formatBaht(toBaht(balance, rate), locale)}
                </span>
              </span>
            )}
          </div>
        </div>

        <form action={saveCreditRate} className="glass flex flex-col gap-3 rounded-2xl p-6">
          <label className="flex items-center gap-2 text-xs text-muted-foreground" htmlFor="credit-rate">
            <Coins className="size-3.5" />
            {text.rateLabel}
          </label>
          <div className="flex gap-2">
            <Input
              className="h-10 max-w-40 rounded-xl font-mono"
              defaultValue={rate}
              id="credit-rate"
              inputMode="decimal"
              min="0.0001"
              name="rate"
              required
              step="0.0001"
              type="number"
            />
            <Button type="submit" variant="secondary">
              {text.saveRate}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{text.rateHelp}</p>
        </form>
      </div>

      {reports.length === 0 ? (
        <div className="glass flex flex-col items-center gap-3 rounded-3xl px-6 py-20 text-center">
          <FolderOpen className="size-6 text-primary" />
          <p className="font-display text-xl font-semibold">{text.emptyTitle}</p>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">{text.emptyBody}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => (
            <ReportCard
              dict={dict}
              key={report.project?.id ?? "unassigned"}
              locale={locale}
              rate={rate}
              report={report}
            />
          ))}
        </div>
      )}
    </main>
  );
}
