// Reads a video's length from its MP4 movie header (moov > mvhd), so stored
// clips get a duration without ffmpeg. Returns undefined when the bytes have
// no usable header: not an MP4, a fragmented MP4 (length lives elsewhere), or
// a truncated file.

type BoxRange = { start: number; end: number };

function typeAt(view: DataView, offset: number) {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}

// Payload range of the first box of `type` among the siblings in [from, to).
function findBox(view: DataView, from: number, to: number, type: string): BoxRange | undefined {
  let offset = from;

  while (offset + 8 <= to) {
    let size = view.getUint32(offset);
    let header = 8;

    if (size === 1) {
      if (offset + 16 > to) return undefined;
      size = Number(view.getBigUint64(offset + 8));
      header = 16;
    } else if (size === 0) {
      size = to - offset;
    }

    if (size < header || offset + size > to) return undefined;

    if (typeAt(view, offset + 4) === type) {
      return { start: offset + header, end: offset + size };
    }

    offset += size;
  }

  return undefined;
}

export function readMp4DurationSeconds(bytes: ArrayBuffer | Uint8Array): number | undefined {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const moov = findBox(view, 0, view.byteLength, "moov");
  const mvhd = moov && findBox(view, moov.start, moov.end, "mvhd");

  if (!mvhd) return undefined;

  // Full box: 1 byte version, 3 bytes flags, then creation and modification
  // times (32-bit in version 0, 64-bit in version 1), timescale, duration.
  const version = view.getUint8(mvhd.start);
  const timescaleAt = mvhd.start + (version === 1 ? 20 : 12);
  const durationAt = timescaleAt + 4;

  if (durationAt + (version === 1 ? 8 : 4) > mvhd.end) return undefined;

  const timescale = view.getUint32(timescaleAt);
  const duration =
    version === 1 ? view.getBigUint64(durationAt) : BigInt(view.getUint32(durationAt));
  // All ones means "unknown"; zero is what fragmented files carry here.
  const unknown = version === 1 ? 0xffffffffffffffffn : 0xffffffffn;

  if (timescale === 0 || duration === 0n || duration === unknown) return undefined;

  return Number(duration) / timescale;
}
