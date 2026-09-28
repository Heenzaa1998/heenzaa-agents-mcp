import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
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
import {
  galleryFiltersFrom,
  listGalleryItems,
  type GalleryFilters,
  type GalleryItem,
} from "@/features/gallery/service";
import { hasGallerySession, isGalleryEnabled } from "@/server/auth/gallery-session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gallery",
  robots: { index: false, follow: false },
};

type GalleryPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const kindOptions = [
  { label: "All", value: undefined },
  { label: "Images", value: "image" },
  { label: "Videos", value: "video" },
] as const;

const statusOptions = [
  { label: "Any status", value: undefined },
  { label: "Done", value: "success" },
  { label: "Generating", value: "pending" },
  { label: "Failed", value: "fail" },
] as const;

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
    <nav aria-label={label} className="flex rounded-lg border border-border bg-card p-0.5">
      {options.map((option) => {
        const active = option.value === current;

        return (
          <Link
            aria-current={active ? "true" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-secondary text-foreground"
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

function MediaTile({ item }: { item: GalleryItem }) {
  const media = item.media[0];

  if (!media?.url) {
    const pending = item.status === "pending";
    const failed = item.status === "fail";

    return (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 bg-[repeating-linear-gradient(135deg,var(--muted)_0_10px,var(--card)_10px_20px)] px-6 text-center text-xs text-muted-foreground">
        {pending ? (
          <Loader2 className="size-5 animate-spin text-warning" />
        ) : failed ? (
          <AlertTriangle className="size-5 text-destructive" />
        ) : (
          <ImageIcon className="size-5" />
        )}
        {pending ? "Still generating" : failed ? "Generation failed" : "No file"}
      </div>
    );
  }

  if (item.kind === "video") {
    return (
      <video
        className="aspect-square w-full bg-black object-contain"
        controls
        playsInline
        preload="metadata"
        src={media.url}
      />
    );
  }

  return (
    <a
      className="group block overflow-hidden bg-muted"
      href={media.url}
      rel="noreferrer"
      target="_blank"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- presigned links change on every render, so the image optimizer would refetch every file */}
      <img
        alt={item.prompt}
        className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        decoding="async"
        loading="lazy"
        src={media.url}
      />
    </a>
  );
}

const statusStyles = {
  fail: "bg-destructive/15 text-destructive",
  pending: "bg-warning/15 text-warning",
  success: "bg-success/15 text-success",
} as const;

const statusLabels = { fail: "Failed", pending: "Generating", success: "Done" } as const;

function GalleryCard({ item }: { item: GalleryItem }) {
  const media = item.media[0];
  const Icon = item.kind === "video" ? Film : ImageIcon;

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative">
        <MediaTile item={item} />
        <span className="pointer-events-none absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
          <Icon className="size-3" />
          {item.kind === "video" ? "Video" : "Image"}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="line-clamp-3 text-sm leading-6" title={item.prompt}>
          {item.prompt}
        </p>

        {item.error ? (
          <p className="line-clamp-2 text-xs leading-5 text-destructive" title={item.error}>
            {item.error}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className={cn("rounded-md px-1.5 py-0.5 font-medium", statusStyles[item.status])}>
            {statusLabels[item.status]}
          </span>
          <span className="font-mono">{item.createdAt.slice(0, 16)} UTC</span>
        </div>

        <div className="flex items-center gap-1 border-t border-border pt-3">
          {media?.key ? (
            <>
              <code className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                {media.key}
              </code>
              <CopyButton label="Copy storage key" value={media.key} />
            </>
          ) : (
            <span className="flex-1 text-[11px] text-muted-foreground">
              {item.status === "pending" && item.taskId ? item.taskId : "Not in storage"}
            </span>
          )}

          {media?.url ? (
            <a
              aria-label="Open file"
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              href={media.url}
              rel="noreferrer"
              target="_blank"
              title="Open file"
            >
              <ExternalLink className="size-3.5" />
            </a>
          ) : null}

          {item.status === "pending" && item.taskId ? (
            <form action={checkTask}>
              <input name="taskId" type="hidden" value={item.taskId} />
              <Button size="sm" type="submit" variant="secondary">
                <RefreshCw />
                Check
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  if (!isGalleryEnabled() || !(await hasGallerySession())) {
    redirect("/gallery/login");
  }

  const filters = galleryFiltersFrom(await searchParams);
  const items = await listGalleryItems(filters);
  const isFiltered = Boolean(filters.kind || filters.status || filters.query);

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-24 pt-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-4xl font-semibold tracking-[-0.03em]">Gallery</h1>
          <p className="text-sm text-muted-foreground">
            {items.length === 0
              ? "Nothing here yet."
              : `${items.length} ${items.length === 1 ? "item" : "items"}, newest first. Links on this page last an hour.`}
          </p>
        </div>
        <form action={logout}>
          <Button size="sm" type="submit" variant="ghost">
            <LogOut />
            Sign out
          </Button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          current={filters.kind}
          label="Filter by type"
          options={kindOptions}
          toHref={(kind) => galleryHref(filters, { kind })}
        />
        <Segmented
          current={filters.status}
          label="Filter by status"
          options={statusOptions}
          toHref={(status) => galleryHref(filters, { status })}
        />
        <form className="relative min-w-56 flex-1" method="get" role="search">
          {filters.kind ? <input name="kind" type="hidden" value={filters.kind} /> : null}
          {filters.status ? <input name="status" type="hidden" value={filters.status} /> : null}
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search prompts"
            className="h-9 pl-9"
            defaultValue={filters.query ?? ""}
            name="q"
            placeholder="Search prompts"
          />
        </form>
        {isFiltered ? (
          <Link
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            href={"/gallery" as Route}
          >
            Clear filters
          </Link>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-20 text-center">
          <ImageIcon className="size-6 text-muted-foreground" />
          <p className="font-display text-lg font-semibold">
            {isFiltered ? "Nothing matches these filters" : "Your gallery is empty"}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {isFiltered
              ? "Try another type, status or search."
              : "Ask Claude for an image or a video with the connector on, and it will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <GalleryCard item={item} key={item.id} />
          ))}
        </div>
      )}
    </main>
  );
}
