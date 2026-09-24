# เก็บไฟล์ภาพลง Cloudflare R2 (private + presigned URL)

- **วันที่:** 2026-09-24
- **สถานะ:** approved
- **Change record:** `docs/changes/2026-09-24-r2-media-storage.md` (เติมเมื่อทำเสร็จ)

## ปัญหา

ผลลัพธ์ทุกไฟล์อยู่บน URL ชั่วคราวของ KIE (รูปอยู่ราว 3 วัน วิดีโอราว 24 ชม.) พ้นช่วงนั้นงาน
ที่สร้างไว้หายหมด และ `edit_image` เอารูปเก่าข้ามวันมาแก้ต่อไม่ได้ งานวิดีโอที่จะทำต่อก็ต้อง
มีที่เก็บถาวรก่อน

## ขอบเขต

**อยู่ในขอบเขต:**
- R2 store ใน `src/server/storage/` (put / exists / presign) ผ่าน S3-compatible API
- feature `media`: ก๊อปไฟล์จาก URL ของ KIE ขึ้น R2 และออก presigned URL ใหม่ให้ไฟล์เดิม
- `generate_image` / `edit_image` ก๊อปผลลัพธ์ขึ้น R2 ก่อนคืนค่า
- tool ใหม่ `get_media_url` ขอลิงก์ใหม่ของไฟล์ที่เก็บไว้
- env `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (optional ทั้งหมด)
- unit tests + ตั้ง env บน Vercel

**ไม่อยู่ในขอบเขต:**
- public URL / custom domain (ผู้ใช้เลือก private + presigned)
- DB เก็บประวัติ (Turso) และ tool ค้นงานเก่า
- วิดีโอ (ต่อยอดจากงานนี้ทีหลัง)
- lifecycle rule ลบไฟล์เก่าอัตโนมัติ

## ทางเลือกที่พิจารณา

| ทางเลือก | ข้อดี | ข้อเสีย |
| --- | --- | --- |
| A: `@aws-sdk/client-s3` + `s3-request-presigner` | มาตรฐาน เอกสารเยอะ | หนักหลาย MB บน serverless, เวอร์ชันใหม่ส่ง checksum header ที่ต้องตั้ง config พิเศษกับ R2 |
| B: `aws4fetch` | เล็กมาก, ใช้ `fetch` เหมือน KIE client, เอกสาร R2 มีตัวอย่าง presign | เป็น lib ชุมชน ความสามารถน้อยกว่า SDK |
| C: Cloudflare REST API ด้วย API token | ไม่ต้องใช้ S3 credential | ทำ presigned URL ไม่ได้ ผูกกับ API ของ Cloudflare |

## ทางที่เลือก

**B (`aws4fetch`) + bucket ส่วนตัว + presigned URL อายุ 7 วัน** (สูงสุดของ SigV4)
- งานนี้ใช้แค่ PUT / HEAD / presign GET ไม่คุ้มที่จะลาก SDK ทั้งก้อนมา และสอดคล้องกับกฎ repo
  ที่ให้เลือกของเล็กและตรงไปตรงมา
- ชื่อไฟล์คงที่ `images/<taskId>-<n>.<ext>` ทำให้ idempotent: เช็ค HEAD ก่อน ถ้ามีแล้วไม่อัปซ้ำ
  (สำคัญตอนวิดีโอแบบ async ที่ poll หลายรอบ)
- storage **เปิดเมื่อตั้ง env ครบ 4 ตัวเท่านั้น** ถ้าไม่ครบคืน URL ของ KIE แบบเดิม dev/test จึงไม่พัง
- ถ้าก๊อปขึ้น R2 ล้มเหลว **คืน URL ของ KIE แทนพร้อม log warn** ไม่ทำให้ tool ล้ม เพราะผู้ใช้จ่าย
  credit สร้างรูปไปแล้ว; ข้อความผลลัพธ์บอกชัดว่าไฟล์ไหนเก็บถาวรแล้วไหนยังชั่วคราว

## แผนการทำ

1. `pnpm add aws4fetch`
2. env R2_* (optional) ใน `src/server/env.ts` + `.env.example`
3. `src/server/storage/r2.ts` — `createR2Store(config)` คืน `MediaStore` (`enabled`, `put`, `exists`,
   `presign`) หุ้ม `withSpan`; `mediaStore` ตัวจริงสร้างจาก env
4. `src/features/media/contracts.ts` — schema ของ `get_media_url` (key ต้องขึ้นต้น `images/` หรือ `videos/`)
5. `src/features/media/service.ts` — `persistRemoteMedia(urls, { prefix, taskId })` และ
   `getMediaUrl(input)` รับ store/fetch แบบ inject ได้
6. `src/features/image-generation/service.ts` — เรียก `persistRemoteMedia` หลัง KIE เสร็จ,
   คืน `{ taskId, media: MediaItem[] }`
7. `src/app/api/mcp/route.ts` — แก้ข้อความผลลัพธ์ + ลงทะเบียน `get_media_url`
8. tests: `media-schema`, `media-service`, `r2-store` (presign แบบ offline), อัปเดต `image-generation-service`
9. `pnpm check` + ทดสอบจริงในเครื่อง: สร้างรูป → ไฟล์ขึ้น R2 → presigned URL เปิดได้ → `get_media_url`
10. ตั้ง env R2 บน Vercel → PR → merge → ทดสอบ production

## ไฟล์ที่คาดว่าจะแตะ

- `package.json`, `pnpm-lock.yaml`
- `src/server/env.ts`, `.env.example`
- `src/server/storage/r2.ts` (ใหม่)
- `src/features/media/contracts.ts`, `service.ts` (ใหม่)
- `src/features/image-generation/service.ts`
- `src/app/api/mcp/route.ts`
- `tests/unit/media-schema.test.ts`, `media-service.test.ts`, `r2-store.test.ts` (ใหม่)
- `tests/unit/image-generation-service.test.ts`
- `docs/changes/2026-09-24-r2-media-storage.md` (ใหม่)

## ความเสี่ยง / ผลกระทบ

- **ผลต่อ schema:** ไม่มี
- **ผลต่อ API contract:** ข้อความผลลัพธ์ของ `generate_image`/`edit_image` เปลี่ยน (มี key + ลิงก์ 7 วัน);
  เพิ่ม tool `get_media_url`
- **ผลต่อ observability:** เพิ่ม span `storage.*` และ `media.*` ใช้ attribute แบบ low-cardinality
  (prefix/operation เท่านั้น ไม่ใส่ key หรือ URL)
- **เวลา:** โหลด+อัปไฟล์เพิ่มราวไม่กี่วินาทีต่อรูป (2–6 MB) ยังต่ำกว่าลิมิต 300s มาก
- **หน่วยความจำ:** buffer ไฟล์ทั้งก้อนก่อนอัป พอสำหรับรูป; วิดีโอขนาดใหญ่ค่อยพิจารณา stream ทีหลัง
- **ลิงก์หมดอายุ 7 วัน:** ไฟล์ไม่หาย ขอลิงก์ใหม่ได้ด้วย `get_media_url`
- **credential:** token จำกัดสิทธิ์ Object Read & Write เฉพาะ bucket นี้ เก็บใน Vercel env
- **แผนถอยกลับ:** ลบ env R2_* ออก ระบบกลับไปคืน URL ของ KIE แบบเดิม หรือ revert commit

## แผนตรวจสอบ

- [ ] `pnpm check`
- [ ] `pnpm e2e` (ถ้าแตะ route/page/flow) — ทดสอบ MCP ด้วย curl แทน
- [ ] `pnpm observability:test` — ไม่รัน (ต้องใช้ Docker) span ใหม่ตามแพตเทิร์นเดิม
- [ ] Docker build/run — ไม่แตะ
- [ ] ทดสอบจริง: ไฟล์ขึ้น R2, presigned URL เปิดได้, `get_media_url` ใช้ได้ ทั้ง local และ production
