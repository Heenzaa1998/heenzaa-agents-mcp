import { AwsClient } from "aws4fetch";
import { env } from "@/server/env";
import { AppError } from "@/server/errors/app-error";
import { withSpan } from "@/server/observability/tracing";

// SigV4 caps presigned URLs at 7 days.
export const PRESIGN_TTL_SECONDS = 7 * 24 * 60 * 60;

export type R2Config = {
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucket?: string;
};

export type MediaStore = {
  enabled: boolean;
  put: (key: string, body: ArrayBuffer, contentType: string) => Promise<void>;
  exists: (key: string) => Promise<boolean>;
  presign: (key: string, ttlSeconds?: number) => Promise<string>;
};

function notConfigured() {
  return new AppError("R2 storage is not configured on the server.", {
    code: "storage_not_configured",
    statusCode: 503,
  });
}

function disabledStore(): MediaStore {
  return {
    enabled: false,
    async put() {
      throw notConfigured();
    },
    async exists() {
      return false;
    },
    async presign() {
      throw notConfigured();
    },
  };
}

function prefixOf(key: string) {
  return key.split("/")[0] ?? "unknown";
}

// Private bucket accessed through R2's S3-compatible API. Objects are never
// public; readers get time-limited presigned GET URLs instead.
export function createR2Store(config: R2Config): MediaStore {
  const { accountId, accessKeyId, secretAccessKey, bucket } = config;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return disabledStore();
  }

  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: "s3",
    region: "auto",
    retries: 2,
  });
  const bucketUrl = `https://${accountId}.r2.cloudflarestorage.com/${bucket}`;
  const objectUrl = (key: string) =>
    `${bucketUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;

  return {
    enabled: true,

    put(key, body, contentType) {
      return withSpan(
        "storage.put",
        {
          attributes: {
            "app.storage.operation": "put",
            "app.storage.prefix": prefixOf(key),
          },
        },
        async (span) => {
          const signed = await client.sign(objectUrl(key), {
            method: "PUT",
            body,
            headers: { "Content-Type": contentType },
          });
          // Send the raw bytes ourselves. A Request built around the buffer is
          // sent as a chunked stream with no Content-Length, which R2 rejects
          // with 411 Length Required.
          const response = await fetch(signed.url, {
            method: "PUT",
            headers: signed.headers,
            body,
          });

          if (!response.ok) {
            throw new AppError(`R2 put failed with HTTP ${response.status}.`, {
              code: "storage_put_failed",
              statusCode: 502,
            });
          }

          span.setAttribute("app.storage.bytes", body.byteLength);
        },
      );
    },

    exists(key) {
      return withSpan(
        "storage.exists",
        {
          attributes: {
            "app.storage.operation": "head",
            "app.storage.prefix": prefixOf(key),
          },
        },
        async () => {
          const response = await client.fetch(objectUrl(key), { method: "HEAD" });

          if (response.status === 404) {
            return false;
          }

          if (!response.ok) {
            throw new AppError(`R2 head failed with HTTP ${response.status}.`, {
              code: "storage_head_failed",
              statusCode: 502,
            });
          }

          return true;
        },
      );
    },

    async presign(key, ttlSeconds = PRESIGN_TTL_SECONDS) {
      const signed = await client.sign(
        new Request(`${objectUrl(key)}?X-Amz-Expires=${ttlSeconds}`),
        { aws: { signQuery: true } },
      );

      return signed.url;
    },
  };
}

export const mediaStore = createR2Store({
  accountId: env.R2_ACCOUNT_ID,
  accessKeyId: env.R2_ACCESS_KEY_ID,
  secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  bucket: env.R2_BUCKET,
});
