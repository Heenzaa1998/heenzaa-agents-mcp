import { getMediaUrlSchema, isStoredKey, type MediaPrefix } from "@/features/media/contracts";
import { AppError } from "@/server/errors/app-error";
import { logger } from "@/server/logger";
import { withSpan } from "@/server/observability/tracing";
import {
  mediaStore,
  PRESIGN_TTL_SECONDS,
  type MediaStore,
} from "@/server/storage/r2";
import { makeThumbnail, thumbnailKeyFor } from "@/server/storage/thumbnail";

export type MediaItem = {
  url: string;
  // null when the file could not be stored and `url` is the provider's
  // temporary link.
  key: string | null;
  expiresInSeconds: number | null;
  // Set when a small WebP preview was stored alongside an image.
  thumbKey?: string;
};

export type PersistOptions = {
  prefix: MediaPrefix;
  taskId: string;
};

type FetchLike = (input: string) => Promise<Response>;
export type Thumbnailer = (
  bytes: ArrayBuffer | Uint8Array,
) => Promise<Uint8Array<ArrayBuffer>>;

// Best-effort: a failed preview must never fail storing the original. The
// gallery falls back to the original and regenerates missing previews later.
export async function storeThumbnail(
  key: string,
  bytes: ArrayBuffer | Uint8Array,
  store: MediaStore,
  thumbnailer: Thumbnailer = makeThumbnail,
): Promise<string | undefined> {
  try {
    const thumbKey = thumbnailKeyFor(key);

    await store.put(thumbKey, await thumbnailer(bytes), "image/webp");

    return thumbKey;
  } catch (error) {
    logger.warn(
      {
        operation: "store_thumbnail",
        error: error instanceof Error ? error.message : String(error),
      },
      "Thumbnail failed; the original is still stored",
    );

    return undefined;
  }
}

const CONTENT_TYPES: Record<string, string> = {
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".webp": "image/webp",
};

function extensionOf(url: string, prefix: MediaPrefix) {
  const match = /\.[a-z0-9]+$/.exec(new URL(url).pathname.toLowerCase());

  if (match && CONTENT_TYPES[match[0]]) {
    return match[0];
  }

  return prefix === "videos" ? ".mp4" : ".png";
}

export function buildMediaKey(
  prefix: MediaPrefix,
  taskId: string,
  index: number,
  extension: string,
) {
  const safeTaskId = taskId.replace(/[^A-Za-z0-9_-]/g, "") || "task";

  return `${prefix}/${safeTaskId}-${index + 1}${extension}`;
}

async function persistOne(
  url: string,
  index: number,
  options: PersistOptions,
  store: MediaStore,
  fetchFn: FetchLike,
  thumbnailer: Thumbnailer,
): Promise<MediaItem> {
  const extension = extensionOf(url, options.prefix);
  const key = buildMediaKey(options.prefix, options.taskId, index, extension);
  let thumbKey: string | undefined;

  try {
    // Deterministic keys make this idempotent: a retried or re-polled task
    // does not upload the same file twice.
    if (!(await store.exists(key))) {
      const response = await fetchFn(url);

      if (!response.ok) {
        throw new AppError(`Download failed with HTTP ${response.status}.`, {
          code: "media_download_failed",
          statusCode: 502,
        });
      }

      const contentType =
        CONTENT_TYPES[extension] ??
        response.headers.get("content-type") ??
        "application/octet-stream";

      const bytes = await response.arrayBuffer();

      await store.put(key, bytes, contentType);

      if (options.prefix === "images") {
        thumbKey = await storeThumbnail(key, bytes, store, thumbnailer);
      }
    }

    return {
      url: await store.presign(key),
      key,
      expiresInSeconds: PRESIGN_TTL_SECONDS,
      ...(thumbKey ? { thumbKey } : {}),
    };
  } catch (error) {
    // The user already paid for the generation, so fall back to the
    // provider's temporary URL instead of failing the whole tool call.
    logger.warn(
      {
        operation: "persist_media",
        prefix: options.prefix,
        error: error instanceof Error ? error.message : String(error),
      },
      "Media persist failed; returning provider URL",
    );

    return { url, key: null, expiresInSeconds: null };
  }
}

export async function persistRemoteMedia(
  urls: string[],
  options: PersistOptions,
  store: MediaStore = mediaStore,
  fetchFn: FetchLike = fetch,
  thumbnailer: Thumbnailer = makeThumbnail,
): Promise<MediaItem[]> {
  if (!store.enabled) {
    return urls.map((url) => ({ url, key: null, expiresInSeconds: null }));
  }

  return withSpan(
    "media.persist",
    {
      attributes: {
        "app.feature": "media",
        "app.operation": "persist_media",
        "app.media.prefix": options.prefix,
      },
    },
    async (span) => {
      const items: MediaItem[] = [];

      for (const [index, url] of urls.entries()) {
        items.push(await persistOne(url, index, options, store, fetchFn, thumbnailer));
      }

      span.setAttribute(
        "app.media.stored_count",
        items.filter((item) => item.key !== null).length,
      );

      return items;
    },
  );
}

export async function getMediaUrl(
  input: unknown,
  store: MediaStore = mediaStore,
): Promise<MediaItem> {
  return withSpan(
    "media.get_url",
    {
      attributes: {
        "app.feature": "media",
        "app.operation": "get_media_url",
      },
    },
    async () => {
      const { key } = getMediaUrlSchema.parse(input);

      if (!store.enabled) {
        throw new AppError("R2 storage is not configured on the server.", {
          code: "storage_not_configured",
          statusCode: 503,
        });
      }

      if (!(await store.exists(key))) {
        throw new AppError(`No stored media found for key ${key}.`, {
          code: "media_not_found",
          statusCode: 404,
        });
      }

      return {
        url: await store.presign(key),
        key,
        expiresInSeconds: PRESIGN_TTL_SECONDS,
      };
    },
  );
}

// Turns tool inputs that are storage keys into presigned links, leaving URLs
// as they are, so KIE can fetch them.
export async function resolveMediaInputs(
  values: string[],
  store: MediaStore = mediaStore,
): Promise<string[]> {
  return Promise.all(
    values.map(async (value) => {
      if (!isStoredKey(value)) {
        return value;
      }

      if (!store.enabled) {
        throw new AppError("Storage keys need R2 storage, which is not configured on the server.", {
          code: "storage_not_configured",
          statusCode: 503,
        });
      }

      if (!(await store.exists(value))) {
        throw new AppError(`No stored file with key ${value}.`, {
          code: "media_not_found",
          statusCode: 404,
        });
      }

      return store.presign(value);
    }),
  );
}

export type MediaResolver = (values: string[]) => Promise<string[]>;
