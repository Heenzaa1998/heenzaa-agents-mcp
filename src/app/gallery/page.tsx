import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, ImageIcon, LogOut, RefreshCw, Video } from "lucide-react";
import { checkTask, logout } from "@/app/gallery/actions";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  galleryFiltersFrom,
  listGalleryItems,
  type GalleryItem,
  type GalleryMedia,
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

const statusClassNames = {
  fail: "border-transparent bg-[color:var(--destructive)]/10 text-[color:var(--destructive)]",
  pending: "border-transparent bg-amber-500/15 text-amber-800",
  success: "border-transparent bg-emerald-600/10 text-emerald-800",
} as const;

const selectClassName =
  "h-11 rounded-2xl border border-input/70 bg-background/80 px-4 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

function MediaPreview({ item, media }: { item: GalleryItem; media: GalleryMedia | undefined }) {
  if (!media?.url) {
    const Icon = item.kind === "video" ? Video : ImageIcon;

    return (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-secondary/60 text-sm text-muted-foreground">
        <Icon className="size-6" />
        {item.status === "pending" ? "Still generating" : "No file"}
      </div>
    );
  }

  if (item.kind === "video") {
    return (
      <video
        className="aspect-square w-full bg-foreground object-contain"
        controls
        playsInline
        preload="metadata"
        src={media.url}
      />
    );
  }

  return (
    <a href={media.url} rel="noreferrer" target="_blank">
      {/* eslint-disable-next-line @next/next/no-img-element -- presigned links change on every render, so the image optimizer would refetch every file */}
      <img
        alt={item.prompt}
        className="aspect-square w-full object-cover"
        loading="lazy"
        src={media.url}
      />
    </a>
  );
}

function GalleryCard({ item }: { item: GalleryItem }) {
  const [primary, ...more] = item.media;

  return (
    <Card className="overflow-hidden p-0">
      <MediaPreview item={item} media={primary} />
      <CardContent className="grid gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{item.kind}</Badge>
          <Badge className={statusClassNames[item.status]}>{item.status}</Badge>
          <span className="text-xs text-muted-foreground">
            {item.createdAt.slice(0, 16)} UTC
          </span>
        </div>

        <p className="line-clamp-4 text-sm leading-6 text-foreground">{item.prompt}</p>

        {item.media.map((media, index) =>
          media.key ? (
            <code className="break-all text-xs text-muted-foreground" key={media.key}>
              {media.key}
            </code>
          ) : (
            <span className="text-xs text-muted-foreground" key={`unstored-${index}`}>
              Not saved to storage
            </span>
          ),
        )}

        {item.error ? (
          <p className="text-xs leading-5 text-[color:var(--destructive)]">{item.error}</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {primary?.url ? (
            <Button asChild size="sm" variant="outline">
              <a href={primary.url} rel="noreferrer" target="_blank">
                Open
                <ExternalLink className="size-4" />
              </a>
            </Button>
          ) : null}
          {more.length > 0 ? (
            <span className="self-center text-xs text-muted-foreground">
              +{more.length} more
            </span>
          ) : null}
          {item.status === "pending" && item.taskId ? (
            <form action={checkTask}>
              <input name="taskId" type="hidden" value={item.taskId} />
              <Button size="sm" type="submit" variant="secondary">
                <RefreshCw className="size-4" />
                Check status
              </Button>
            </form>
          ) : null}
        </div>
      </CardContent>
    </Card>
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
    <PageShell>
      <section className="flex flex-col gap-5 rounded-[2rem] border border-border/70 bg-card/88 p-7 shadow-[0_28px_80px_rgba(111,63,20,0.16)] md:flex-row md:items-end md:justify-between">
        <div className="grid gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">
            Private gallery
          </p>
          <h1 className="text-4xl font-semibold tracking-[-0.06em] text-foreground">
            Your generations
          </h1>
          <p className="text-sm text-muted-foreground">
            Newest first, up to 30 at a time. Links on this page last one hour.
          </p>
        </div>
        <form action={logout}>
          <Button size="sm" type="submit" variant="outline">
            <LogOut className="size-4" />
            Sign out
          </Button>
        </form>
      </section>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
          Type
          <select className={selectClassName} defaultValue={filters.kind ?? ""} name="kind">
            <option value="">All</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
          Status
          <select className={selectClassName} defaultValue={filters.status ?? ""} name="status">
            <option value="">All</option>
            <option value="success">Done</option>
            <option value="pending">Generating</option>
            <option value="fail">Failed</option>
          </select>
        </label>
        <label className="grid min-w-56 flex-1 gap-1 text-xs font-semibold text-muted-foreground">
          Prompt contains
          <Input defaultValue={filters.query ?? ""} name="q" placeholder="cat, poster..." />
        </label>
        <Button type="submit">Filter</Button>
        {isFiltered ? (
          <Button asChild variant="ghost">
            <Link href={"/gallery" as Route}>Clear</Link>
          </Button>
        ) : null}
      </form>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {isFiltered
              ? "Nothing matches these filters."
              : "No generations yet. Ask Claude to create an image or a video through the MCP connector."}
          </CardContent>
        </Card>
      ) : (
        <div className={cn("grid gap-5 sm:grid-cols-2 lg:grid-cols-3")}>
          {items.map((item) => (
            <GalleryCard item={item} key={item.id} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
