import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, Film, ImageIcon, Loader2 } from "lucide-react";
import { chooseTake } from "@/app/projects/actions";
import { TakeInspector } from "@/components/take-inspector";
import { Button } from "@/components/ui/button";
import type { Dictionary, Locale } from "@/content/i18n";
import { toGalleryItem, type GalleryItem } from "@/features/gallery/service";
import { isStoredKey } from "@/features/media/contracts";
import {
  getCreditRate,
  getProjectReport,
  sortShots,
  toBaht,
  type ShotSummary,
} from "@/features/projects/service";
import { listReferences, type ReferenceItem } from "@/features/references/service";
import { requireGallerySession } from "@/server/auth/gallery-session";
import { getDictionary } from "@/server/i18n";
import { formatBaht, formatCredits } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ProjectPageProps = { params: Promise<{ id: string }> };

// Images of the project by storage key, so a video take can show what it was made from.
type KeyIndex = Map<string, { id: number; preview: string | null }>;

type BoardShot = ShotSummary & { items: GalleryItem[] };

type BoardContext = { dict: Dictionary; locale: Locale; rate: number; index: KeyIndex };

async function loadReport(params: ProjectPageProps["params"]) {
  const id = Number((await params).id);

  return Number.isSafeInteger(id) && id > 0 ? getProjectReport(id) : null;
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  await requireGallerySession();

  const report = await loadReport(params);

  return { title: report?.project?.name ?? "Project", robots: { index: false, follow: false } };
}

function costLabel(take: GalleryItem, ctx: BoardContext) {
  return take.credits === null
    ? ctx.dict.gallery.costPending
    : `${formatBaht(toBaht(take.credits, ctx.rate), ctx.locale)} · ${formatCredits(take.credits, ctx.locale)} cr`;
}

function StatusIcon({ take }: { take: GalleryItem }) {
  if (take.status === "pending") return <Loader2 className="size-5 animate-spin text-warning" />;
  if (take.status === "fail") return <AlertTriangle className="size-5 text-destructive" />;
  return take.kind === "video" ? <Film className="size-5" /> : <ImageIcon className="size-5" />;
}

function ChosenBadge({ dict }: { dict: Dictionary }) {
  return (
    <span className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
      <Check className="size-3" />
      {dict.projects.chosen}
    </span>
  );
}

function KeyframeTile({ take, ctx }: { take: GalleryItem; ctx: BoardContext }) {
  const media = take.media[0];
  const preview = media?.thumbUrl ?? media?.url ?? null;

  return (
    <div
      className={cn(
        "relative w-28 shrink-0 overflow-hidden rounded-lg border bg-card",
        take.selected ? "border-primary" : "border-white/[0.08]",
      )}
      id={`gen-${take.id}`}
    >
      {take.selected ? <ChosenBadge dict={ctx.dict} /> : null}
      <a className="block aspect-[9/16] bg-muted" href={media?.url ?? undefined} rel="noreferrer" target="_blank">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- presigned links change on every render
          <img alt={take.prompt} className="size-full object-cover" loading="lazy" src={preview} />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <StatusIcon take={take} />
          </div>
        )}
      </a>
      <div className="flex items-center justify-between gap-1 px-2 py-1.5 text-[11px]">
        <span className="font-mono text-muted-foreground">#{take.id}</span>
        <span className={cn("truncate", take.credits === null ? "text-warning" : "text-foreground")}>{costLabel(take, ctx)}</span>
      </div>
      {take.status === "success" && !take.selected ? (
        <form action={chooseTake} className="px-2 pb-2">
          <input name="generationId" type="hidden" value={take.id} />
          <Button className="h-7 w-full text-[11px]" size="sm" type="submit" variant="secondary">
            {ctx.dict.projects.choose}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

function MadeFrom({ inputs, ctx }: { inputs: string[]; ctx: BoardContext }) {
  const known = inputs.filter((input) => isStoredKey(input));

  if (known.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
      <span>{ctx.dict.projects.madeFrom}</span>
      {known.map((key, position) => {
        const image = ctx.index.get(key);

        return image ? (
          <a
            className="flex items-center gap-1 rounded-md border border-white/[0.08] bg-muted/40 px-1 py-0.5"
            href={`#gen-${image.id}`}
            key={`${key}-${position}`}
          >
            {image.preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- presigned links change on every render
              <img alt="" className="h-7 w-4 rounded-sm object-cover" src={image.preview} />
            ) : null}
            <span className="font-mono">#{image.id}</span>
          </a>
        ) : (
          <span className="rounded-md border border-white/[0.08] px-1 py-0.5 font-mono" key={`${key}-${position}`} title={key}>
            {key.split("/").slice(-2).join("/")}
          </span>
        );
      })}
    </div>
  );
}

function TakeCard({ take, ctx }: { take: GalleryItem; ctx: BoardContext }) {
  const media = take.media[0];
  const dict = ctx.dict;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border bg-card",
        take.selected ? "border-primary shadow-[0_0_30px_-12px_var(--primary)]" : "border-white/[0.08]",
      )}
      id={`gen-${take.id}`}
    >
      <div className="relative">
        {take.selected ? <ChosenBadge dict={dict} /> : null}
        {take.status === "success" && media?.url ? (
          <div className="p-2">
            <TakeInspector labels={dict.projects.inspector} seconds={take.durationSeconds} src={media.url} />
          </div>
        ) : (
          <div className="flex aspect-[9/16] items-center justify-center bg-muted text-muted-foreground">
            <StatusIcon take={take} />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-mono text-muted-foreground">#{take.id}</span>
          <span className={take.credits === null ? "text-warning" : "text-foreground"}>{costLabel(take, ctx)}</span>
        </div>
        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground" title={take.prompt}>
          {take.prompt}
        </p>
        <MadeFrom ctx={ctx} inputs={take.inputs} />
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

function ShotSection({ shot, ctx }: { shot: BoardShot; ctx: BoardContext }) {
  const text = ctx.dict.projects;
  const images = shot.items.filter((item) => item.kind === "image");
  const videos = shot.items.filter((item) => item.kind === "video");

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-white/[0.06] pb-3">
        <h2 className="font-display text-xl font-semibold tracking-tight">{shot.label ?? text.noShot}</h2>
        <p className="text-sm text-muted-foreground">
          {text.shotSummary(shot.takes.length, shot.failed)} ·{" "}
          <span className="text-foreground">{formatBaht(toBaht(shot.credits, ctx.rate), ctx.locale)}</span>
        </p>
      </div>
      {images.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="eyebrow text-muted-foreground">{text.keyframes}</h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((take) => (
              <KeyframeTile ctx={ctx} key={take.id} take={take} />
            ))}
          </div>
        </div>
      ) : null}
      {videos.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="eyebrow text-muted-foreground">{text.videos}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map((take) => (
              <TakeCard ctx={ctx} key={take.id} take={take} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function References({ items, dict }: { items: ReferenceItem[]; dict: Dictionary }) {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl font-semibold tracking-tight">{dict.projects.references}</h2>
        <p className="text-xs text-muted-foreground">{dict.projects.referencesHelp}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
        {items.map((item) => (
          <a className="flex flex-col gap-1" href={item.url} key={item.key} rel="noreferrer" target="_blank">
            {/* eslint-disable-next-line @next/next/no-img-element -- presigned links change on every render */}
            <img
              alt={item.name}
              className="aspect-square w-full rounded-lg border border-white/[0.08] object-cover"
              loading="lazy"
              src={item.url}
            />
            <span className="truncate text-xs">{item.name}</span>
            <span className="truncate font-mono text-[10px] text-muted-foreground" title={item.key}>
              {item.key}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  await requireGallerySession();

  const [report, { dict, locale }, rate] = await Promise.all([loadReport(params), getDictionary(), getCreditRate()]);

  if (!report?.project) {
    notFound();
  }

  const [references, shots] = await Promise.all([
    listReferences({ project: report.project.name }),
    Promise.all(
      sortShots(report.shots).map(async (shot) => ({
        ...shot,
        items: await Promise.all(shot.takes.map((take) => toGalleryItem(take))),
      })),
    ),
  ]);

  const index: KeyIndex = new Map();

  for (const item of shots.flatMap((shot) => shot.items)) {
    if (item.kind !== "image") continue;

    for (const media of item.media) {
      if (media.key) {
        index.set(media.key, { id: item.id, preview: media.thumbUrl ?? media.url });
      }
    }
  }

  const ctx: BoardContext = { dict, locale, rate, index };
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
        <h1 className="font-display text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{report.project.name}</h1>
        <div className="glass flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl px-6 py-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">{text.spent}</span>
            <span className="font-display text-2xl font-semibold">{formatBaht(toBaht(report.credits, rate), locale)}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {formatCredits(report.credits, locale)} {dict.gallery.credits}
          </span>
          <span className="text-sm text-muted-foreground">
            {text.takes(report.takes)} · {text.failed(report.failed)}
          </span>
          <span className="text-sm text-muted-foreground">{text.clipsUsed(report.clipsUsed, report.usedSeconds)}</span>
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

      <References dict={dict} items={references} />

      {shots.map((shot) => (
        <ShotSection ctx={ctx} key={shot.label ?? "no-shot"} shot={shot} />
      ))}
    </main>
  );
}
