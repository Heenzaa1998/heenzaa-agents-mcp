import {
  GENERATION_KINDS,
  GENERATION_STATUSES,
  type ListGenerationsInput,
} from "@/features/generations/contracts";
import {
  generationRepository,
  type GenerationRepository,
} from "@/features/generations/repository";
import { listGenerations } from "@/features/generations/service";
import { storeThumbnail, type Thumbnailer } from "@/features/media/service";
import type { GenerationRecord, StoredMediaRef } from "@/server/db/schema";
import { logger } from "@/server/logger";
import { withSpan } from "@/server/observability/tracing";
import { mediaStore, type MediaStore } from "@/server/storage/r2";
import { makeThumbnail } from "@/server/storage/thumbnail";

// Links on the page only need to outlive a viewing session.
export const GALLERY_LINK_TTL_SECONDS = 60 * 60;
export const GALLERY_PAGE_SIZE = 30;

export type GalleryMedia = {
  key: string | null;
  // Presigned link for stored files, the provider link for unstored ones, or
  // null when storage is off and there is nothing to show.
  url: string | null;
  // Small preview to show in the grid; null means show `url` instead.
  thumbUrl: string | null;
};

export type GalleryItem = Pick<
  GenerationRecord,
  | "id"
  | "kind"
  | "status"
  | "prompt"
  | "model"
  | "createdAt"
  | "taskId"
  | "error"
  | "credits"
  | "projectId"
  | "shot"
  | "selected"
  | "durationSeconds"
  | "inputs"
> & {
  media: GalleryMedia[];
};

export type GalleryPage = {
  items: GalleryItem[];
  // Stored images that have no preview yet, to be filled in after the response.
  needsThumbnails: GenerationRecord[];
};

export type GalleryFilters = Pick<ListGenerationsInput, "kind" | "status" | "query">;

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function oneOf<T extends string>(values: readonly T[], value: string | undefined) {
  return values.find((candidate) => candidate === value);
}

// Turns URL search params into filters, silently dropping anything invalid so
// a hand-edited URL shows an unfiltered page instead of an error.
export function galleryFiltersFrom(searchParams: SearchParams): GalleryFilters {
  const query = first(searchParams.q)?.trim().slice(0, 200);

  return {
    kind: oneOf(GENERATION_KINDS, first(searchParams.kind)),
    status: oneOf(GENERATION_STATUSES, first(searchParams.status)),
    query: query || undefined,
  };
}

export async function toGalleryMedia(
  ref: StoredMediaRef,
  store: MediaStore = mediaStore,
): Promise<GalleryMedia> {
  if (ref.key && store.enabled) {
    const [url, thumbUrl] = await Promise.all([
      store.presign(ref.key, GALLERY_LINK_TTL_SECONDS),
      ref.thumbKey ? store.presign(ref.thumbKey, GALLERY_LINK_TTL_SECONDS) : null,
    ]);

    return { key: ref.key, url, thumbUrl };
  }

  return { key: ref.key, url: ref.url ?? null, thumbUrl: null };
}

export async function toGalleryItem(
  record: GenerationRecord,
  store: MediaStore = mediaStore,
): Promise<GalleryItem> {
  return {
    id: record.id,
    kind: record.kind,
    status: record.status,
    prompt: record.prompt,
    model: record.model,
    createdAt: record.createdAt,
    taskId: record.taskId,
    error: record.error,
    credits: record.credits,
    projectId: record.projectId,
    shot: record.shot,
    selected: record.selected,
    durationSeconds: record.durationSeconds,
    inputs: record.inputs,
    media: await Promise.all(record.media.map((ref) => toGalleryMedia(ref, store))),
  };
}

function lacksThumbnail(record: GenerationRecord) {
  return record.kind === "image" && record.media.some((ref) => ref.key && !ref.thumbKey);
}

type GenerationLister = (input: unknown) => Promise<GenerationRecord[]>;

export async function listGalleryItems(
  filters: GalleryFilters,
  list: GenerationLister = listGenerations,
  store: MediaStore = mediaStore,
): Promise<GalleryPage> {
  return withSpan(
    "gallery.list",
    {
      attributes: {
        "app.feature": "gallery",
        "app.operation": "list_gallery_items",
      },
    },
    async (span) => {
      const records = await list({ ...filters, limit: GALLERY_PAGE_SIZE });

      const items = await Promise.all(records.map((record) => toGalleryItem(record, store)));
      const needsThumbnails = store.enabled ? records.filter(lacksThumbnail) : [];

      span.setAttribute("app.gallery.items", items.length);
      span.setAttribute("app.gallery.missing_thumbnails", needsThumbnails.length);

      return { items, needsThumbnails };
    },
  );
}

type FetchLike = (input: string) => Promise<Response>;

// Creates previews for images stored before thumbnails existed (or whose
// preview failed). Runs after the page is sent, so a slow download never
// delays the gallery. Failures are logged and retried on a later visit.
export async function backfillThumbnails(
  records: GenerationRecord[],
  store: MediaStore = mediaStore,
  repository: Pick<GenerationRepository, "updateMedia"> = generationRepository,
  fetchFn: FetchLike = fetch,
  thumbnailer: Thumbnailer = makeThumbnail,
): Promise<number> {
  if (!store.enabled || records.length === 0) {
    return 0;
  }

  return withSpan(
    "gallery.backfill_thumbnails",
    {
      attributes: {
        "app.feature": "gallery",
        "app.operation": "backfill_thumbnails",
      },
    },
    async (span) => {
      let created = 0;

      for (const record of records) {
        let changed = false;
        const media: StoredMediaRef[] = [];

        for (const ref of record.media) {
          if (!ref.key || ref.thumbKey || record.kind !== "image") {
            media.push(ref);
            continue;
          }

          try {
            const response = await fetchFn(await store.presign(ref.key));

            if (!response.ok) {
              throw new Error(`Original download failed with HTTP ${response.status}`);
            }

            const thumbKey = await storeThumbnail(
              ref.key,
              await response.arrayBuffer(),
              store,
              thumbnailer,
            );

            if (thumbKey) {
              media.push({ ...ref, thumbKey });
              changed = true;
              created += 1;
              continue;
            }
          } catch (error) {
            logger.warn(
              {
                operation: "backfill_thumbnail",
                error: error instanceof Error ? error.message : String(error),
              },
              "Thumbnail backfill failed; will retry on a later visit",
            );
          }

          media.push(ref);
        }

        if (changed) {
          await repository.updateMedia(record.id, media);
        }
      }

      span.setAttribute("app.gallery.thumbnails_created", created);

      return created;
    },
  );
}
