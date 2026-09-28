import sharp from "sharp";
import { withSpan } from "@/server/observability/tracing";

// Wide enough for a gallery card on a 2x screen, small enough to load fast.
export const THUMBNAIL_WIDTH = 720;
const THUMBNAIL_QUALITY = 72;

// images/<taskId>-1.png -> thumbs/<taskId>-1.webp
export function thumbnailKeyFor(key: string) {
  const file = key.split("/").pop() ?? key;
  const base = file.replace(/\.[^.]+$/, "");

  return `thumbs/${base}.webp`;
}

export async function makeThumbnail(
  bytes: ArrayBuffer | Uint8Array,
): Promise<Uint8Array<ArrayBuffer>> {
  return withSpan(
    "media.thumbnail",
    { attributes: { "app.feature": "media", "app.operation": "make_thumbnail" } },
    async (span) => {
      const output = await sharp(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes))
        .rotate()
        .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
        .webp({ quality: THUMBNAIL_QUALITY })
        .toBuffer();

      span.setAttribute("app.media.thumbnail_bytes", output.byteLength);

      return new Uint8Array(output);
    },
  );
}
