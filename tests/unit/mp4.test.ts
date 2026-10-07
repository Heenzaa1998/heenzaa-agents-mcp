import { describe, expect, it } from "vitest";
import { readMp4DurationSeconds } from "@/server/storage/mp4";

function concat(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;

  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }

  return out;
}

function box(type: string, ...payload: Uint8Array[]) {
  const body = concat(payload);
  const out = new Uint8Array(8 + body.length);

  new DataView(out.buffer).setUint32(0, out.length);
  out.set(new TextEncoder().encode(type), 4);
  out.set(body, 8);

  return out;
}

// A box whose size is written in the 64-bit field (size == 1).
function largeBox(type: string, payload: Uint8Array) {
  const out = new Uint8Array(16 + payload.length);
  const view = new DataView(out.buffer);

  view.setUint32(0, 1);
  out.set(new TextEncoder().encode(type), 4);
  view.setBigUint64(8, BigInt(out.length));
  out.set(payload, 16);

  return out;
}

function mvhdV0(timescale: number, duration: number) {
  const payload = new Uint8Array(100);
  const view = new DataView(payload.buffer);

  view.setUint32(12, timescale);
  view.setUint32(16, duration);

  return box("mvhd", payload);
}

function mvhdV1(timescale: number, duration: bigint) {
  const payload = new Uint8Array(112);
  const view = new DataView(payload.buffer);

  view.setUint8(0, 1);
  view.setUint32(20, timescale);
  view.setBigUint64(24, duration);

  return box("mvhd", payload);
}

const ftyp = box("ftyp", new TextEncoder().encode("isomiso2mp41"));

describe("readMp4DurationSeconds", () => {
  it("reads a version 0 movie header", () => {
    const file = concat([ftyp, box("moov", mvhdV0(1000, 4600)), box("mdat", new Uint8Array(32))]);

    expect(readMp4DurationSeconds(file)).toBe(4.6);
  });

  it("reads a version 1 movie header", () => {
    const file = concat([ftyp, box("moov", mvhdV1(90_000, 450_000n))]);

    expect(readMp4DurationSeconds(file)).toBe(5);
  });

  it("finds moov after a 64-bit mdat and mvhd after other boxes", () => {
    const file = concat([
      ftyp,
      largeBox("mdat", new Uint8Array(64)),
      box("moov", box("iods", new Uint8Array(8)), mvhdV0(600, 6000)),
    ]);

    expect(readMp4DurationSeconds(file)).toBe(10);
  });

  it("accepts an ArrayBuffer", () => {
    const file = concat([ftyp, box("moov", mvhdV0(1000, 2500))]);

    expect(readMp4DurationSeconds(file.buffer)).toBe(2.5);
  });

  it("returns undefined without a usable header", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const whole = concat([ftyp, box("moov", mvhdV0(1000, 4600))]);

    expect(readMp4DurationSeconds(png)).toBeUndefined();
    expect(readMp4DurationSeconds(new Uint8Array())).toBeUndefined();
    expect(readMp4DurationSeconds(concat([ftyp, box("moov", box("trak"))]))).toBeUndefined();
    // Cut off in the middle of moov.
    expect(readMp4DurationSeconds(whole.slice(0, whole.length - 40))).toBeUndefined();
    // Fragmented files leave the movie duration at zero.
    expect(readMp4DurationSeconds(concat([ftyp, box("moov", mvhdV0(1000, 0))]))).toBeUndefined();
    expect(readMp4DurationSeconds(concat([ftyp, box("moov", mvhdV0(0, 4600))]))).toBeUndefined();
    expect(
      readMp4DurationSeconds(concat([ftyp, box("moov", mvhdV0(1000, 0xffffffff))])),
    ).toBeUndefined();
  });
});
