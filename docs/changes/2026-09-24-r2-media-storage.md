# เก็บไฟล์ภาพลง Cloudflare R2 (private + presigned URL)

- **วันที่:** 2026-09-24
- **Design doc:** `docs/design/2026-09-24-r2-media-storage.md`
- **Commit / PR:** branch `feat/r2-media-storage`

## เปลี่ยนอะไร

`generate_image` / `edit_image` ก๊อปผลลัพธ์จาก URL ชั่วคราวของ KIE ขึ้น bucket ส่วนตัวบน R2
แล้วคืน presigned URL อายุ 7 วันพร้อม storage key และเพิ่ม tool `get_media_url` ให้ขอลิงก์ใหม่
ของไฟล์เดิมได้ทุกเมื่อ

## ทำไม

ไฟล์บน KIE หายภายในไม่กี่วัน ทำให้งานที่สร้างหายและ `edit_image` แก้รูปเก่าข้ามวันไม่ได้
และงานวิดีโอที่จะทำต่อต้องมีที่เก็บถาวรรองรับ

## ไฟล์ที่แตะ

| ไฟล์ | สิ่งที่ทำ |
| --- | --- |
| `package.json`, `pnpm-lock.yaml` | เพิ่ม `aws4fetch` |
| `src/server/env.ts`, `.env.example` | เพิ่ม `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (optional) |
| `src/server/storage/r2.ts` | ใหม่ — `createR2Store()` / `mediaStore`: put, exists, presign หุ้ม `withSpan` |
| `src/features/media/contracts.ts` | ใหม่ — schema ของ `get_media_url` + รูปแบบ key ที่อนุญาต |
| `src/features/media/service.ts` | ใหม่ — `persistRemoteMedia()` (idempotent, fallback เป็น URL ของ KIE เมื่อพัง) และ `getMediaUrl()` |
| `src/features/image-generation/service.ts` | เรียก `persistRemoteMedia` หลัง KIE เสร็จ คืน `{ taskId, media }` |
| `src/app/api/mcp/route.ts` | ข้อความผลลัพธ์ใหม่ (ลิงก์ + key) และลงทะเบียน `get_media_url` |
| `tests/unit/media-schema.test.ts`, `media-service.test.ts`, `r2-store.test.ts` | ใหม่ — 17 เทส |
| `tests/unit/image-generation-service.test.ts` | อัปเดตให้ inject persist stub |

## ต่างจากแผนตรงไหน

- **อัปโหลดด้วย `client.fetch` ของ aws4fetch ใช้กับ R2 ไม่ได้** — ทดสอบจริงแล้ว R2 ตอบ
  `411 Length Required` เพราะ aws4fetch ห่อ body ไว้ใน `Request` ทำให้ Node ส่งแบบ chunked
  stream ไม่มี `Content-Length` แก้โดยให้ aws4fetch ทำแค่เซ็น (`client.sign`) แล้วส่ง
  `ArrayBuffer` เองด้วย `fetch` และเพิ่มเทสกันถอยกลับใน `r2-store.test.ts`
- fallback ที่ออกแบบไว้ทำงานตามคาด: ตอนที่ put พัง tool ยังคืน URL ของ KIE และบอกชัดว่า
  "not saved to storage" ไม่ได้ล้มทั้งคำขอ

## ตรวจสอบแล้ว

- [x] `pnpm check` — lint + typecheck + test ผ่าน (41/41)
- [ ] `pnpm e2e` — ทดสอบ MCP ด้วย curl กับ dev server แทน
- [ ] `pnpm observability:test` — ไม่ได้รัน (ต้องใช้ Docker)
- [ ] Docker build/run — ไม่แตะ

ผลลัพธ์ / สิ่งที่ยังค้าง:
- local: `tools/list` เห็น 3 tools; `generate_image` สร้างรูปจริงแล้วไฟล์ขึ้น R2
  (`images/<taskId>-1.png`), presigned URL เปิดได้ 200 `image/png` 1.78 MB
- `get_media_url`: key ที่มีอยู่ได้ลิงก์ใหม่ที่เปิดได้, key ที่ไม่มีได้ `media_not_found`,
  key ผิดรูปแบบถูกปฏิเสธตั้งแต่ขั้นตรวจ input
- ตั้ง env R2 ทั้ง 4 ตัวบน Vercel production + preview แล้ว; ยืนยันบน production หลัง merge

## ตามมาทีหลัง

- วิดีโอ (async `generate_video` + `get_task_status`) ใช้ `persistRemoteMedia` ที่ prefix `videos`
- stream วิดีโอไฟล์ใหญ่ขึ้น R2 แทนการ buffer ทั้งก้อน
- DB เก็บประวัติ (Turso) + tool ค้นงานเก่า
- lifecycle rule ลบไฟล์เก่าอัตโนมัติ ถ้าพื้นที่เริ่มเยอะ
