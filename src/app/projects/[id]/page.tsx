import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, Film, ImageIcon, Loader2 } from "lucide-react";
import { chooseTake } from "@/app/projects/actions";
import { Button } from "@/components/ui/button";
import type { Dictionary, Locale } from "@/content/i18n";
import { toGalleryItem, type GalleryItem } from "@/features/gallery/service";
import {
  getCreditRate,
  getProjectReport,
  toBaht,
  type ShotSummary,
} from "@/features/projects/service";
import { requireGallerySession } from "@/server/auth/gallery-session";
import { getDictionary } from "@/server/i18n";
import { formatBaht, formatCredits } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ProjectPageProps = { params: Promise<{ id: string }> };

async function loadReport(params: ProjectPageProps["params"]) {
  const id = Number((await params).id);

  return Number.isSafeInteger(id) && id > 0 ? getProjectReport(id) : null;
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  await requireGallerySession();

  const report = await loadReport(params);

  return { title: report?.project?.name ?? "Project", robots: { index: false, follow: false } };
}

function TakeCard({
  dict,
  locale,
  rate,
  take,
}: {
  dict: Dictionary;
  locale: Locale;
  rate: number;
  take: GalleryItem;
}) {
  const media = take.media[0];
  const preview = media?.thumbUrl ?? media?.url;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border bg-card",
        take.selected ? "border-primary shadow-[0_0_30px_-12px_var(--primary)]" : "border-white/[0.08]",
      )}
    >
      <div className="relative aspect-video bg-muted">
        {take.kind === "video" && media?.url ? (
          <video className="size-full bg-black object-contain" controls playsInline preload="metadata" src={media.url} />
        ) : preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- presigned links change on every render
          <img alt={take.prompt} className="size-full object-cover" loading="lazy" src={preview} />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            {take.status === "pending" ? (
              <Loader2 className="size-5 animate-spin text-warning" />
            ) : take.status === "fail" ? (
              <AlertTriangle className="size-5 text-destructive" />
            ) : take.kind === "video" ? (
              <Film className="size-5" />
            ) : (
              <ImageIcon className="size-5" />
            )}
          </div>
        )}
        {take.selected ? (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
            <Check className="size-3" />
            {dict.projects.chosen}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-mono text-muted-foreground">#{take.id}</span>
          <span className={take.credits === null ? "text-warning" : "text-foreground"}>
            {take.credits === null
              ? dict.gallery.costPending
              : `${formatBaht(toBaht(take.credits, rate), locale)} · ${formatCredits(take.credits, locale)} cr`}
          </span>
        </div>
        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground" title={take.prompt}>
          {take.prompt}
        </p>
        {take.status === "success" && !take.selected ? (
          <form action={chooseTake}>
            <input name="generationId" type="hidden" value={take.id} />
            <Button className="w-full" size="sm" type="submit" variant="secondary">
              {dict.projects.choose}
            </Button>
          </form>
        ) : null}
        {take.status !== "success" ? (
          <span className="text-[11px] text-muted-foreground">{dict.gallery.status[take.status]}</span>
        ) : null}
      </div>
    </div>
  );
}

async function ShotSection({
  dict,
  locale,
  rate,
  shot,
}: {
  dict: Dictionary;
  locale: Locale;
  rate: number;
  shot: ShotSummary;
}) {
  const takes = await Promise.all(shot.takes.map((take) => toGalleryItem(take)));

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-white/[0.06] pb-3">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          {shot.label ?? dict.projects.noShot}
        </h2>
        <p className="text-sm text-muted-foreground">
          {dict.projects.shotSummary(shot.takes.length, shot.failed)} ·{" "}
          <span className="text-foreground">{formatBaht(toBaht(shot.credits, rate), locale)}</span>
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {takes.map((take) => (
          <TakeCard dict={dict} key={take.id} locale={locale} rate={rate} take={take} />
        ))}
      </div>
    </section>
  );
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  await requireGallerySession();

  const [report, { dict, locale }, rate] = await Promise.all([
    loadReport(params),
    getDictionary(),
    getCreditRate(),
  ]);

  if (!report?.project) {
    notFound();
  }

  const text = dict.projects;

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-10 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4">
        <Link
          className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          href={"/projects" as Route}
        >
          <ArrowLeft className="size-3.5" />
          {text.back}
        </Link>
        <h1 className="font-display text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
          {report.project.name}
        </h1>
        <div className="glass flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl px-6 py-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">{text.spent}</span>
            <span className="font-display text-2xl font-semibold">
              {formatBaht(toBaht(report.credits, rate), locale)}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {formatCredits(report.credits, locale)} {dict.gallery.credits}
          </span>
          <span className="text-sm text-muted-foreground">
            {text.takes(report.takes)} · {text.failed(report.failed)}
          </span>
          <span className="text-sm text-muted-foreground">
            {text.clipsUsed(report.clipsUsed, report.usedSeconds)}
          </span>
          {report.creditsPerUsedSecond !== null ? (
            <span className="text-sm text-foreground">
              {formatBaht(toBaht(report.creditsPerUsedSecond, rate), locale)} {text.perUsedSecond}
            </span>
          ) : null}
          {report.unknownCredits > 0 ? (
            <span className="text-xs text-warning">{text.unknownCredits(report.unknownCredits)}</span>
          ) : null}
        </div>
      </div>

      {report.shots.map((shot) => (
        <ShotSection
          dict={dict}
          key={shot.label ?? "no-shot"}
          locale={locale}
          rate={rate}
          shot={shot}
        />
      ))}
    </main>
  );
}
