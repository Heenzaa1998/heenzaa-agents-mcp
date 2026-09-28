import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { after } from "next/server";
import {
  AlertTriangle,
  ExternalLink,
  Film,
  ImageIcon,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
} from "lucide-react";
import { checkTask, logout } from "@/app/gallery/actions";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Dictionary, Locale } from "@/content/i18n";
import {
  backfillThumbnails,
  galleryFiltersFrom,
  listGalleryItems,
  type GalleryFilters,
  type GalleryItem,
} from "@/features/gallery/service";
import { hasGallerySession, isGalleryEnabled } from "@/server/auth/gallery-session";
import { getDictionary } from "@/server/i18n";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();

  return { title: dict.gallery.title, robots: { index: false, follow: false } };
}

type GalleryPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type GalleryText = Dictionary["gallery"];

// Postgres returns e.g. "2026-09-24 03:16:09.64+00"; shown in the owner's time zone.
function formatWhen(createdAt: string, locale: Locale) {
  const date = new Date(createdAt.replace(" ", "T").replace(/\+00$/, "Z"));

  if (Number.isNaN(date.getTime())) {
    return createdAt.slice(0, 16);
  }

  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

function galleryHref(filters: GalleryFilters, change: Partial<GalleryFilters>) {
  const next = { ...filters, ...change };
  const params = new URLSearchParams();

  if (next.kind) params.set("kind", next.kind);
  if (next.status) params.set("status", next.status);
  if (next.query) params.set("q", next.query);

  const query = params.toString();

  return (query ? `/gallery?${query}` : "/gallery") as Route;
}

function Segmented<T extends string | undefined>({
  current,
  label,
  options,
  toHref,
}: {
  current: T;
  label: string;
  options: readonly { label: string; value: T }[];
  toHref: (value: T) => Route;
}) {
  return (
    <nav aria-label={label} className="glass flex rounded-full p-1">
      {options.map((option) => {
        const active = option.value === current;

        return (
          <Link
            aria-current={active ? "true" : undefined}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            href={toHref(option.value)}
            key={option.label}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}

const statusStyles = {
  fail: "bg-destructive/20 text-destructive",
  pending: "bg-warning/20 text-warning",
  success: "bg-success/20 text-success",
} as const;

function Placeholder({ item, text }: { item: GalleryItem; text: GalleryText }) {
  const pending = item.status === "pending";
  const failed = item.status === "fail";

  return (
    <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 bg-[repeating-linear-gradient(135deg,oklch(0.2_0.006_285)_0_12px,oklch(0.18_0.006_285)_12px_24px)] px-6 text-center text-xs text-muted-foreground">
      {pending ? (
        <Loader2 className="size-6 animate-spin text-warning" />
      ) : failed ? (
        <AlertTriangle className="size-6 text-destructive" />
      ) : (
        <ImageIcon className="size-6" />
      )}
      {pending ? text.stillGenerating : failed ? text.generationFailed : text.noFile}
    </div>
  );
}

function Actions({ item, text, dict }: { item: GalleryItem; text: GalleryText; dict: Dictionary }) {
  const media = item.media[0];

  return (
    <div className="flex items-center gap-1">
      {media?.key ? (
        <CopyButton
          className="text-white/80 hover:bg-white/15 hover:text-white"
          copiedLabel={dict.common.copied}
          label={text.copyKey}
          value={media.key}
        />
      ) : null}
      {media?.url ? (
        <a
          aria-label={text.open}
          className="inline-flex size-7 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          href={media.url}
          rel="noreferrer"
          target="_blank"
          title={text.open}
        >
          <ExternalLink className="size-3.5" />
        </a>
      ) : null}
    </div>
  );
}

function GalleryCard({
  dict,
  item,
  locale,
}: {
  dict: Dictionary;
  item: GalleryItem;
  locale: Locale;
}) {
  const text = dict.gallery;
  const media = item.media[0];
  const KindIcon = item.kind === "video" ? Film : ImageIcon;
  const when = formatWhen(item.createdAt, locale);
  const badges = (
    <div className="pointer-events-none absolute left-3 top-3 flex gap-1.5">
      <span className="flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
        <KindIcon className="size-3" />
        {text.kind[item.kind]}
      </span>
      {item.status !== "success" ? (
        <span className={cn("rounded-full px-2 py-1 text-[11px] font-medium backdrop-blur", statusStyles[item.status])}>
          {text.status[item.status]}
        </span>
      ) : null}
    </div>
  );

  // Images: the picture fills the card and details appear over it on hover.
  if (item.kind === "image" && media?.url) {
    return (
      <article className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-muted">
        <a href={media.url} rel="noreferrer" target="_blank">
          {/* eslint-disable-next-line @next/next/no-img-element -- presigned links change on every render, so the image optimizer would refetch every file */}
          <img
            alt={item.prompt}
            className="block h-auto w-full transition-transform duration-700 group-hover:scale-[1.03]"
            decoding="async"
            loading="lazy"
            src={media.thumbUrl ?? media.url}
          />
        </a>
        {badges}
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-16 transition-opacity duration-300 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
          <p className="line-clamp-3 text-sm leading-6 text-white" title={item.prompt}>
            {item.prompt}
          </p>
          <div className="flex items-center justify-between gap-2 text-[11px] text-white/70">
            <span>{when}</span>
            <Actions dict={dict} item={item} text={text} />
          </div>
        </div>
      </article>
    );
  }

  // Videos and items without a file: media on top, details below, so video
  // controls are never covered.
  return (
    <article className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card">
      <div className="relative">
        {media?.url ? (
          <video
            className="block h-auto w-full bg-black"
            controls
            playsInline
            preload="metadata"
            src={media.url}
          />
        ) : (
          <Placeholder item={item} text={text} />
        )}
        {badges}
      </div>
      <div className="flex flex-col gap-3 p-4">
        <p className="line-clamp-3 text-sm leading-6" title={item.prompt}>
          {item.prompt}
        </p>
        {item.error ? (
          <p className="line-clamp-2 text-xs leading-5 text-destructive" title={item.error}>
            {item.error}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>{when}</span>
          <div className="flex items-center gap-1 [&_a]:text-muted-foreground [&_button]:text-muted-foreground">
            <Actions dict={dict} item={item} text={text} />
            {item.status === "pending" && item.taskId ? (
              <form action={checkTask}>
                <input name="taskId" type="hidden" value={item.taskId} />
                <Button size="sm" type="submit" variant="secondary">
                  <RefreshCw />
                  {text.check}
                </Button>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  if (!isGalleryEnabled() || !(await hasGallerySession())) {
    redirect("/gallery/login");
  }

  const [{ dict, locale }, params] = await Promise.all([getDictionary(), searchParams]);
  const text = dict.gallery;
  const filters = galleryFiltersFrom(params);
  const { items, needsThumbnails } = await listGalleryItems(filters);

  if (needsThumbnails.length > 0) {
    // Fill in missing previews once the page has been sent.
    after(() => backfillThumbnails(needsThumbnails));
  }
  const isFiltered = Boolean(filters.kind || filters.status || filters.query);

  const kindOptions = [
    { label: text.all, value: undefined },
    { label: text.images, value: "image" },
    { label: text.videos, value: "video" },
  ] as const;
  const statusOptions = [
    { label: text.anyStatus, value: undefined },
    { label: text.status.success, value: "success" },
    { label: text.status.pending, value: "pending" },
    { label: text.status.fail, value: "fail" },
  ] as const;

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-5xl font-semibold tracking-[-0.045em]">
            <span className="text-gradient">{text.title}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {items.length === 0 ? text.empty : text.summary(items.length)}
          </p>
        </div>
        <form action={logout}>
          <Button className="glass" size="sm" type="submit" variant="outline">
            <LogOut />
            {text.signOut}
          </Button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          current={filters.kind}
          label={text.filterType}
          options={kindOptions}
          toHref={(kind) => galleryHref(filters, { kind })}
        />
        <Segmented
          current={filters.status}
          label={text.filterStatus}
          options={statusOptions}
          toHref={(status) => galleryHref(filters, { status })}
        />
        <form className="relative min-w-56 flex-1" method="get" role="search">
          {filters.kind ? <input name="kind" type="hidden" value={filters.kind} /> : null}
          {filters.status ? <input name="status" type="hidden" value={filters.status} /> : null}
          <Search className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={text.search}
            className="glass h-10 rounded-full pl-10"
            defaultValue={filters.query ?? ""}
            name="q"
            placeholder={text.search}
          />
        </form>
        {isFiltered ? (
          <Link
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            href={"/gallery" as Route}
          >
            {text.clearFilters}
          </Link>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="glass flex flex-col items-center gap-3 rounded-3xl px-6 py-24 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <ImageIcon className="size-5" />
          </span>
          <p className="font-display text-xl font-semibold">
            {isFiltered ? text.noMatchTitle : text.emptyTitle}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {isFiltered ? text.noMatchBody : text.emptyBody}
          </p>
        </div>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4 [&>*]:mb-4 [&>*]:break-inside-avoid">
          {items.map((item) => (
            <GalleryCard dict={dict} item={item} key={item.id} locale={locale} />
          ))}
        </div>
      )}
    </main>
  );
}
