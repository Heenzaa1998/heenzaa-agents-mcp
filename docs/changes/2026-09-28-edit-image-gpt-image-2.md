# edit_image ใช้ GPT Image 2 และรองรับสัดส่วนภาพทุกแบบ

- **วันที่:** 2026-09-28
- **Design doc:** `docs/design/2026-09-28-edit-image-gpt-image-2.md`
- **Commit / PR:** branch `feat/edit-image-gpt-image-2`

## เปลี่ยนอะไร

- `edit_image` ใช้ `gpt-image-2-image-to-image` เป็นค่าเริ่มต้น รองรับสัดส่วนภาพ 16 แบบ (รวม 9:16)
  ความละเอียด 1K/2K/4K และ `background`
- พารามิเตอร์ใหม่ `model` (`gpt-image-2` | `gpt-image-1.5`) รุ่น 1.5 ยังใช้ได้เหมือนเดิม
  (1:1/2:3/3:2 + `quality`) ถ้าส่ง `auto` มาจะแปลงเป็น 3:2
- `quality` ยังรับได้ (ใช้กับรุ่น 1.5 เท่านั้น) client เก่าที่ส่งมาจึงไม่พัง
- ตรวจกฎของ KIE ใน schema ทั้ง `generate_image` และ `edit_image`:
  - `auto` ใช้ได้กับ 1K เท่านั้น
  - 2K/4K ใช้ไม่ได้กับ 5:4, 4:5, 3:1, 1:3, 9:21
  - 1:1 ใช้กับ 4K ไม่ได้
  - `background` ใช้ได้กับ 1K เท่านั้น
- ประวัติบันทึกรุ่นที่ใช้จริง (`gpt-image-2-image-to-image` หรือ `gpt-image/1.5-image-to-image`)

## ทำไม

ภาพ keyframe สำหรับวิดีโอแนวตั้งต้องออกเป็น 9:16 แต่รุ่น 1.5 ทำได้แค่ 2:3 เลยต้องครอปเสียขอบ

## ไฟล์ที่แตะ

| ไฟล์ | สิ่งที่ทำ |
| --- | --- |
| `src/features/image-generation/contracts.ts` | schema ใหม่ของ edit (`model`, สัดส่วนทุกแบบ, `resolution`, `background`) + `checkImageOptions` ใช้ร่วมกับ generate |
| `src/server/kie/client.ts` | `IMAGE_TO_IMAGE_MODEL` = รุ่น 2, `LEGACY_IMAGE_TO_IMAGE_MODEL` = รุ่น 1.5, ส่งพารามิเตอร์ตามรุ่น |
| `src/features/image-generation/service.ts` | เลือกรุ่น, แปลง `auto` → 3:2 สำหรับรุ่น 1.5, บันทึกรุ่นลงประวัติ |
| `tests/unit/image-generation-schema.test.ts`, `image-generation-service.test.ts` | เทสกฎของ KIE, ค่าเริ่มต้น, รุ่น 1.5, client เก่า |

## ต่างจากแผนตรงไหน

ไม่มี

## ตรวจสอบแล้ว

- [x] `pnpm check` — lint + typecheck + test ผ่าน (135/135)
- [ ] `pnpm e2e` — ไม่รัน (DB ร่วมกับ production)
- [x] dev + MCP `tools/list`: `edit_image` มี `model`, สัดส่วนทุกแบบ, `resolution` ครบ
- [x] dev + MCP `tools/call`: `resolution: 2K` กับ `auto` และ `gpt-image-1.5` กับ 9:16 ถูกปฏิเสธพร้อมข้อความที่ชัดเจน (ไม่เสียเครดิต)

ผลลัพธ์ / สิ่งที่ยังค้าง:
- ยังไม่ได้แก้ภาพ 9:16 จริงบน KIE (ใช้เครดิต) จะได้ทดสอบตอนทำภาพช็อตของ EP01

## ตามมาทีหลัง

- skill ในเครื่อง (`imagegen/scripts/generate_image.py`) ยังใช้รุ่น 1.5 สำหรับการแก้ภาพ
