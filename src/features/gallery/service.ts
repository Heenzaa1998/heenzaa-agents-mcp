import {
  GENERATION_KINDS,
  GENERATION_STATUSES,
  type ListGenerationsInput,
} from "@/features/generations/contracts";
import { listGenerations } from "@/features/generations/service";
import type { GenerationRecord } from "@/server/db/schema";
import { withSpan } from "@/server/observability/tracing";
import { mediaStore, type MediaStore } from "@/server/storage/r2";

// Links on the page only need to outlive a viewing session.
export const GALLERY_LINK_TTL_SECONDS = 60 * 60;
export const GALLERY_PAGE_SIZE = 30;

export type GalleryMedia = {
  key: string | null;
  // Presigned link for stored files, the provider link for unstored ones, or
  // null when storage is off and there is nothing to show.
  url: string | null;
};

export type GalleryItem = Pick<
  GenerationRecord,
  "id" | "kind" | "status" | "prompt" | "model" | "createdAt" | "taskId" | "error"
> & {
  media: GalleryMedia[];
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

type GenerationLister = (input: unknown) => Promise<GenerationRecord[]>;

export async function listGalleryItems(
  filters: GalleryFilters,
  list: GenerationLister = listGenerations,
  store: MediaStore = mediaStore,
): Promise<GalleryItem[]> {
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

      const items = await Promise.all(
        records.map(async (record) => ({
          id: record.id,
          kind: record.kind,
          status: record.status,
          prompt: record.prompt,
          model: record.model,
          createdAt: record.createdAt,
          taskId: record.taskId,
          error: record.error,
          media: await Promise.all(
            record.media.map(async (ref): Promise<GalleryMedia> => {
              if (ref.key && store.enabled) {
                return {
                  key: ref.key,
                  url: await store.presign(ref.key, GALLERY_LINK_TTL_SECONDS),
                };
              }

              return { key: ref.key, url: ref.url ?? null };
            }),
          ),
        })),
      );

      span.setAttribute("app.gallery.items", items.length);

      return items;
    },
  );
}
