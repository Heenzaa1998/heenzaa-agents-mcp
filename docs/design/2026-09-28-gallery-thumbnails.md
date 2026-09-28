# Thumbnail สำหรับรูปใน gallery

- **วันที่:** 2026-09-28
- **สถานะ:** approved
- **Change record:** `docs/changes/2026-09-28-gallery-thumbnails.md` (เติมเมื่อทำเสร็จ)

## ปัญหา

gallery โหลดไฟล์ต้นฉบับทุกรูป (PNG 2–6 MB ต่อรูป) หน้าที่มี 30 รูปอาจหนักเกิน 100 MB
บนมือถือโหลดช้ามาก และเปลือง data ของผู้ใช้

## ขอบเขต

**อยู่ในขอบเขต:**
- สร้าง thumbnail WebP กว้าง 720px ตอนเก็บรูปลง R2 (key `thumbs/<ชื่อไฟล์เดิม>.webp`)
- เก็บ key ของ thumbnail ใน `generations.media` (`thumbKey`)
- gallery แสดง thumbnail กดแล้วเปิดไฟล์ต้นฉบับ
- รูปเก่าที่ยังไม่มี thumbnail: สร้างย้อนหลังอัตโนมัติหลังส่งหน้าเว็บ (`after()`)
- เพิ่ม `sharp` เป็น dependency ตรง (ตอนนี้มากับ Next.js แต่ import ตรงไม่ได้)

**ไม่อยู่ในขอบเขต:**
- ภาพ poster ของวิดีโอ (ต้องใช้ ffmpeg) วิดีโอยังใช้ `preload="metadata"`
- ส่ง thumbnail ผ่าน MCP tools (Claude ใช้ไฟล์ต้นฉบับ)

## ทางเลือกที่พิจารณา

| ทางเลือก | ข้อดี | ข้อเสีย |
| --- | --- | --- |
| A: `next/image` optimizer กับลิงก์ presigned | ไม่ต้องเก็บไฟล์เพิ่ม | ลิงก์เปลี่ยนทุก render cache ไม่ติด ต้องย่อใหม่ทุกครั้งและเสียค่า image optimization |
| B: สร้าง thumbnail ตอนเก็บไฟล์ + สร้างย้อนหลัง | ย่อครั้งเดียว ไฟล์เล็กถาวร | เพิ่ม dependency `sharp`, เก็บไฟล์เพิ่มใน R2 (เล็กมาก) |
| C: script backfill แยก | ควบคุมเวลา run ได้ | ต้องจำรันเอง และรูปที่พลาดก็ไม่มี thumbnail ตลอดไป |

## ทางที่เลือก

**B** — ย่อครั้งเดียวแล้วใช้ตลอด และการสร้างย้อนหลังผ่าน `after()` ทำให้ไม่ต้องมี script แยก
และซ่อมตัวเองได้ถ้า thumbnail ไหนหาย

- thumbnail ล้มเหลวต้อง**ไม่ทำให้การเก็บไฟล์ล้ม** (log warn แล้วไปต่อ) gallery จะใช้ไฟล์ต้นฉบับแทน
- `after()` ทำงานหลังส่ง response แล้ว จึงไม่ทำให้หน้าโหลดช้า รอบแรกเห็นต้นฉบับ รอบต่อไปเห็น thumbnail
- ย่อด้วย `rotate()` (ตาม EXIF) + กว้าง 720px ไม่ขยายรูปเล็ก + WebP คุณภาพ 72

## แผนการทำ

1. `pnpm add sharp`
2. `src/server/storage/thumbnail.ts` — `thumbnailKeyFor(key)`, `makeThumbnail(bytes)`
3. `MediaStore.put` รับ `ArrayBuffer | Uint8Array`
4. `persistRemoteMedia`: รูปที่อัปใหม่สร้าง thumbnail จาก bytes ที่มีอยู่แล้ว (ไม่ดาวน์โหลดซ้ำ) และคืน `thumbKey`
5. `toMediaRefs` / `StoredMediaRef` เพิ่ม `thumbKey`
6. `generationRepository.updateMedia(id, media)` + `backfillThumbnails(records)` ใน feature media/gallery
7. gallery: presign thumbnail ถ้ามี, ส่งรายการที่ขาดให้ `after()`
8. tests + วัดขนาดจริงก่อน/หลังบน dev
9. PR → merge → ยืนยัน production

## ไฟล์ที่คาดว่าจะแตะ

- `package.json`, `pnpm-lock.yaml`
- `src/server/storage/thumbnail.ts` (ใหม่), `src/server/storage/r2.ts`
- `src/server/db/schema.ts` (type เท่านั้น ไม่มี migration เพราะ `media` เป็น jsonb)
- `src/features/media/service.ts`, `src/features/generations/service.ts`, `repository.ts`
- `src/features/gallery/service.ts`, `src/app/gallery/page.tsx`
- tests ที่เกี่ยวข้อง
- `docs/changes/2026-09-28-gallery-thumbnails.md` (ใหม่)

## ความเสี่ยง / ผลกระทบ

- **ผลต่อ schema:** ไม่มี migration (เพิ่ม field ใน jsonb)
- **ผลต่อ API contract:** ไม่เปลี่ยน
- **ผลต่อ observability:** span ใหม่ `media.thumbnail`, `gallery.backfill_thumbnails`
- **ขนาด function:** `sharp` มี binary ของ libvips (~ทศ MB) ยังอยู่ในลิมิตของ Vercel
- **เวลา:** ย่อรูปเพิ่มเวลาเก็บไฟล์ราว 1 วินาทีต่อรูป
- **แผนถอยกลับ:** revert; ไฟล์ใน `thumbs/` ที่เหลืออยู่ไม่มีผลกับโค้ดเดิม

## แผนตรวจสอบ

- [ ] `pnpm check`
- [ ] `pnpm e2e` — ไม่รัน (DB ร่วมกับ production)
- [ ] Docker build (dependency ใหม่ที่มี native binary)
- [ ] วัดจริง: ขนาดที่ gallery โหลด ก่อน/หลัง, thumbnail ถูกสร้างย้อนหลังครบ
