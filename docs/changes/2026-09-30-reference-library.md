# คลังไฟล์อ้างอิง: อัปโหลดครั้งเดียว ใช้ด้วย key ได้ตลอด

- **วันที่:** 2026-09-30
- **Design doc:** `docs/design/2026-09-30-reference-library.md`
- **Commit / PR:** commit ตรงเข้า `main` ตามที่เจ้าของ repo สั่ง (ไม่เปิด PR)

## เปลี่ยนอะไร

- ตารางใหม่ `reference_images` (migration `0003_colossal_prowler`, apply ลง Neon แล้ว)
- MCP tools ใหม่: `upload_reference` (แหล่งเป็น `url` / `key` / `data_base64` อย่างใดอย่างหนึ่ง;
  ตรวจว่าเป็น PNG/JPEG/WebP ด้วย sharp; เก็บที่ `refs/<name>.<ext>`; ชื่อซ้ำ = แทนที่) และ `list_references`
- `edit_image.image_urls`, `generate_video.image_url` / `end_image_url` / `elements[].image_urls` และ
  `get_media_url.key` รับ **storage key** ได้ (`refs/...`, `images/...`, `videos/...`) นอกจาก https URL
  ระบบ presign ให้ก่อนส่ง KIE (`resolveMediaInputs` ใน feature media) key ที่ไม่มีไฟล์จะได้ `media_not_found`
- สคริปต์ในเครื่อง `imagegen/cat-family/tools/upload_ref.py <name> <file>` ย่อเป็น JPEG แล้วส่งให้ tool

## ทำไม

ภาพอ้างอิงตัวละครและฉากต้องอัปโหลดนอกระบบทุกครั้งและลิงก์หมดอายุใน 7 วัน ตอนใหม่ต้องเริ่มใหม่หมด
ตอนนี้อัปโหลดครั้งเดียว แล้วเรียกด้วยชื่อได้ตลอด และผลลัพธ์เก่าเอามาต่อยอดได้โดยไม่ต้องขอลิงก์ก่อน

## ไฟล์ที่แตะ

| ไฟล์ | สิ่งที่ทำ |
| --- | --- |
| `src/server/db/schema.ts`, `drizzle/0003_colossal_prowler.sql` | ตาราง `reference_images` |
| `src/features/references/{contracts,repository,service}.ts` | feature ใหม่ |
| `src/features/media/contracts.ts` | `MEDIA_KEY_PATTERN` รวม `refs/`, `mediaInputSchema`, `isStoredKey` |
| `src/features/media/service.ts` | `resolveMediaInputs` |
| `src/features/image-generation/{contracts,service}.ts`, `src/features/video-generation/{contracts,service}.ts` | รับ key และ presign ก่อนเรียก KIE |
| `src/app/api/mcp/route.ts` | tools `upload_reference`, `list_references`; คำอธิบาย `edit_image` |
| `tests/unit/references-service.test.ts` (ใหม่), image/video service tests | เทส schema, upload จาก base64/key, list, การแปลง key |

## ต่างจากแผนตรงไหน

ไม่มี

## ตรวจสอบแล้ว

- [x] `pnpm check` — lint + typecheck + test ผ่าน (159/159)
- [ ] `pnpm e2e` — ไม่รัน (DB ร่วมกับ production)
- [ ] production: อัปโหลด character sheet + ฉากด้วยสคริปต์ แล้ว `list_references` เห็นครบ (เติมหลัง deploy)

## ตามมาทีหลัง

- แสดงคลังอ้างอิงในหน้าโปรเจกต์ (shot board)
- ลบไฟล์อ้างอิง
