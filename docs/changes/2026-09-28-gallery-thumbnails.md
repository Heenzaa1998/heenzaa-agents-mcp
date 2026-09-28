# Thumbnail สำหรับรูปใน gallery

- **วันที่:** 2026-09-28
- **Design doc:** `docs/design/2026-09-28-gallery-thumbnails.md`
- **Commit / PR:** branch `feat/gallery-thumbnails`

## เปลี่ยนอะไร

ตอนเก็บรูปลง R2 ระบบสร้าง thumbnail WebP กว้าง 720px ไว้ที่ `thumbs/<ชื่อไฟล์>.webp` และบันทึก
`thumbKey` ในประวัติ gallery แสดง thumbnail (กดแล้วเปิดไฟล์ต้นฉบับ) รูปที่ยังไม่มี thumbnail
จะถูกสร้างย้อนหลังด้วย `after()` หลังส่งหน้าเว็บ

## ทำไม

gallery เคยโหลดไฟล์ต้นฉบับ 2–6 MB ต่อรูป ช้าและเปลือง data บนมือถือ

## ไฟล์ที่แตะ

| ไฟล์ | สิ่งที่ทำ |
| --- | --- |
| `package.json`, `pnpm-lock.yaml` | เพิ่ม `sharp` 0.34.5 (เวอร์ชันเดียวกับที่ Next.js ใช้) |
| `src/server/storage/thumbnail.ts` | ใหม่ — `thumbnailKeyFor`, `makeThumbnail` |
| `src/server/storage/r2.ts` | `put` รับ `Uint8Array<ArrayBuffer>` ด้วย |
| `src/features/media/service.ts` | สร้าง thumbnail ตอนเก็บรูปใหม่ (จาก bytes ที่มีแล้ว), `storeThumbnail` แบบไม่ throw |
| `src/server/db/schema.ts`, `src/features/generations/*` | `thumbKey` ใน media ref, `repository.updateMedia` |
| `src/features/gallery/service.ts` | presign thumbnail, `needsThumbnails`, `backfillThumbnails` |
| `src/app/gallery/page.tsx` | ใช้ thumbnail + `after()` สร้างย้อนหลัง |
| `tests/unit/thumbnail.test.ts` (ใหม่), `gallery-service.test.ts`, `media-service.test.ts` | 11 เทสใหม่ |

## ต่างจากแผนตรงไหน

- TypeScript 5.9 ไม่ยอมให้ `Uint8Array<ArrayBufferLike>` เป็น body ของ `fetch` จึงระบุ type
  เป็น `Uint8Array<ArrayBuffer>` ที่ store และตัวสร้าง thumbnail
- ไม่ได้สร้างรูปใหม่ผ่าน KIE เพื่อทดสอบเส้นทางตอนเก็บไฟล์บน dev (เสีย credit) เส้นทางนี้ใช้
  `storeThumbnail` ตัวเดียวกับการสร้างย้อนหลังที่ทดสอบจริงแล้ว และมี unit test ครอบ

## ตรวจสอบแล้ว

- [x] `pnpm check` — lint + typecheck + test ผ่าน (113/113)
- [ ] `pnpm e2e` — ไม่รัน (DB ร่วมกับ production)
- [x] Docker build `runner` ผ่าน และ `sharp` ทำงานใน container ได้

ผลลัพธ์ / สิ่งที่ยังค้าง:
- วัดบน dev ด้วย Chromium: เปิด gallery ครั้งแรก 4 รูป **11.33 MB** (ต้นฉบับ); หลัง `after()`
  สร้างย้อนหลัง เปิดครั้งที่สอง **0.12 MB** (thumbnail 11–54 KB ต่อรูป) เล็กลงราว 94 เท่า
- ฐานข้อมูลมี `thumbKey` ครบทั้ง 4 รูป วิดีโอไม่มีตามที่ออกแบบ; ภาพที่ 2x ยังคม

## ตามมาทีหลัง

- ภาพ poster ของวิดีโอ (ต้องใช้ ffmpeg)
