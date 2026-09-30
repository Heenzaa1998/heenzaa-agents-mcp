import sharp from "sharp";
import { projectRepository, type ProjectRepository } from "@/features/projects/repository";
import { resolveProjectId } from "@/features/projects/service";
import {
  listReferencesSchema,
  MAX_REFERENCE_BYTES,
  REFERENCE_FORMATS,
  uploadReferenceSchema,
} from "@/features/references/contracts";
import {
  referenceRepository,
  type ReferenceRepository,
} from "@/features/references/repository";
import type { ReferenceImageRecord } from "@/server/db/schema";
import { AppError } from "@/server/errors/app-error";
import { logger } from "@/server/logger";
import { withSpan } from "@/server/observability/tracing";
import { mediaStore, PRESIGN_TTL_SECONDS, type MediaStore } from "@/server/storage/r2";

export type ReferenceItem = {
  name: string;
  key: string;
  url: string;
  expiresInSeconds: number;
  width: number;
  height: number;
  bytes: number;
  projectId: number | null;
};

type FetchLike = (url: string) => Promise<Response>;

// sharp's format names map onto the extension stored in the key.
const EXTENSIONS: Record<string, string> = { png: "png", jpeg: "jpg", webp: "webp" };

async function download(url: string, fetchFn: FetchLike): Promise<ArrayBuffer> {
  const response = await fetchFn(url);

  if (!response.ok) {
    throw new AppError(`Could not download the reference (HTTP ${response.status}).`, {
      code: "reference_download_failed",
      statusCode: 502,
    });
  }

  return response.arrayBuffer();
}

async function describeImage(bytes: Uint8Array) {
  const meta = await sharp(bytes).metadata().catch(() => null);
  const format = meta?.format;

  if (!format || !(REFERENCE_FORMATS as readonly string[]).includes(format) || !meta.width || !meta.height) {
    throw new AppError("The file is not a PNG, JPEG or WebP image.", {
      code: "reference_not_image",
      statusCode: 400,
    });
  }

  // EXIF orientation swaps the stored dimensions for rotated photos.
  const rotated = (meta.orientation ?? 1) >= 5;

  return {
    format,
    extension: EXTENSIONS[format]!,
    contentType: `image/${format}`,
    width: rotated ? meta.height : meta.width,
    height: rotated ? meta.width : meta.height,
  };
}

async function toItem(record: ReferenceImageRecord, store: MediaStore): Promise<ReferenceItem> {
  return {
    name: record.name,
    key: record.key,
    url: await store.presign(record.key),
    expiresInSeconds: PRESIGN_TTL_SECONDS,
    width: record.width,
    height: record.height,
    bytes: record.bytes,
    projectId: record.projectId,
  };
}

export async function uploadReference(
  input: unknown,
  store: MediaStore = mediaStore,
  repository: ReferenceRepository = referenceRepository,
  projects: Pick<ProjectRepository, "findOrCreate"> = projectRepository,
  fetchFn: FetchLike = fetch,
): Promise<ReferenceItem> {
  return withSpan(
    "references.upload",
    { attributes: { "app.feature": "references", "app.operation": "upload_reference" } },
    async (span) => {
      const parsed = uploadReferenceSchema.parse(input);

      if (!store.enabled) {
        throw new AppError("R2 storage is not configured on the server.", {
          code: "storage_not_configured",
          statusCode: 503,
        });
      }

      let bytes: Uint8Array;

      if (parsed.data_base64) {
        bytes = new Uint8Array(Buffer.from(parsed.data_base64, "base64"));
        span.setAttribute("app.references.source", "base64");
      } else if (parsed.key) {
        if (!(await store.exists(parsed.key))) {
          throw new AppError(`No stored file with key ${parsed.key}.`, {
            code: "media_not_found",
            statusCode: 404,
          });
        }
        bytes = new Uint8Array(await download(await store.presign(parsed.key), fetchFn));
        span.setAttribute("app.references.source", "key");
      } else {
        bytes = new Uint8Array(await download(parsed.url!, fetchFn));
        span.setAttribute("app.references.source", "url");
      }

      if (bytes.byteLength === 0 || bytes.byteLength > MAX_REFERENCE_BYTES) {
        throw new AppError(`The image must be between 1 byte and ${MAX_REFERENCE_BYTES / 1024 / 1024} MB.`, {
          code: "reference_too_large",
          statusCode: 400,
        });
      }

      const image = await describeImage(bytes);
      const key = `refs/${parsed.name}.${image.extension}`;

      await store.put(key, bytes as Uint8Array<ArrayBuffer>, image.contentType);

      const record = await repository.upsert({
        name: parsed.name,
        key,
        contentType: image.contentType,
        bytes: bytes.byteLength,
        width: image.width,
        height: image.height,
        projectId: await resolveProjectId(parsed.project, projects),
      });

      span.setAttribute("app.references.bytes", bytes.byteLength);
      logger.info({ operation: "upload_reference", name: parsed.name, key }, "Reference stored");

      return toItem(record, store);
    },
  );
}

export async function listReferences(
  input: unknown,
  store: MediaStore = mediaStore,
  repository: ReferenceRepository = referenceRepository,
  projects: Pick<ProjectRepository, "findByName"> = projectRepository,
): Promise<ReferenceItem[]> {
  return withSpan(
    "references.list",
    { attributes: { "app.feature": "references", "app.operation": "list_references" } },
    async (span) => {
      const parsed = listReferencesSchema.parse(input);
      let projectId: number | undefined;

      if (parsed.project) {
        const project = await projects.findByName(parsed.project.trim());

        if (!project) {
          return [];
        }

        projectId = project.id;
      }

      const rows = await repository.list(projectId, parsed.limit);

      span.setAttribute("app.references.count", rows.length);

      return Promise.all(rows.map((row) => toItem(row, store)));
    },
  );
}
