# หน้าแรก คำอธิบาย tool และ README ให้ตรงกับ tool ที่มีจริง

- **วันที่:** 2026-10-07
- **Design doc:** `docs/design/2026-10-07-sync-tools-docs.md`
- **Commit / PR:** branch `ccr-2e2a9845-ltgqis`

## เปลี่ยนอะไร

- หน้าแรกแสดง tool ครบ 10 ตัว (เพิ่ม `generate_talking_video`, `upload_reference`, `list_references`, `get_costs`)
  เรียงเป็นกลุ่ม สร้างงาน → คลังไฟล์ → ติดตาม การ์ดใหญ่สูง 3 แถวคู่กับ 3 ใบ แล้วที่เหลือแถวละ 3
- หัวข้อนับจำนวนจาก `toolNames.length` (`toolsTitle` เป็นฟังก์ชัน) ไม่พิมพ์ตัวเลขเองแล้ว
- ชื่อโมเดลบนหน้าแรกเป็น GPT Image 2 / Kling 3.0 / Kling AI Avatar
- เทสใหม่อ่าน `src/app/api/mcp/route.ts` แล้วเทียบชื่อใน `registerTool` กับ `toolNames`
- คำอธิบายที่ Claude อ่าน: `get_media_url` ใช้ได้กับทุก key, `upload_reference` บอกว่าใช้กับ `generate_talking_video` ได้,
  `list_generations` / `get_task_status.task_id` / `list_generations.status` รวมงานภาพที่ยัง pending
- `README.md` เขียนใหม่เป็นของ Heenzaa Studio, `AGENTS.md` บอกว่า repo นี้คืออะไรและเพิ่มกฎเรื่อง `toolNames`

## ทำไม

หน้าแรกกับ README ล้าหลังมาตั้งแต่เพิ่ม tool ตัวที่ 7 เพราะไม่มีอะไรเตือนตอนลืม
คำอธิบาย tool ที่ล้าหลังทำให้ Claude ไม่รู้ว่าใช้ `get_media_url` กับ `refs/...` ได้ หรือเช็คภาพที่ยัง pending ได้

## ไฟล์ที่แตะ

| ไฟล์ | สิ่งที่ทำ |
| --- | --- |
| `src/content/site.ts` | `toolNames` 10 ตัว, `models` |
| `src/content/i18n/{en,th}.ts` | คำอธิบาย tool ใหม่, `toolsTitle(count)`, intro/steps/`referencesHelp` |
| `src/components/home-view.tsx` | ไอคอน, layout การ์ด (`FEATURE_ROWS`) |
| `src/app/api/mcp/route.ts`, `src/features/{video-generation,generations}/contracts.ts` | ข้อความ description |
| `tests/unit/home-page.test.tsx` | เทียบกับ `registerTool`, เช็คหัวข้อนับจำนวน |
| `README.md`, `AGENTS.md` | เขียนใหม่ / เพิ่มกฎ |

## ต่างจากแผนตรงไหน

ตรงตามแผน

## ตรวจสอบแล้ว

- [x] `pnpm check` — lint + typecheck + test ผ่าน (167/167)
- [ ] `pnpm e2e` — ไม่รัน (DB ร่วมกับ production); เทสหน้าแรกใน e2e เช็คหัวข้อ, ลิงก์ gallery และ `generate_video` ซึ่งยังอยู่ครบ
- [ ] `pnpm observability:test` — ไม่เกี่ยว
- [ ] Docker build/run — ไม่เกี่ยว
- [x] dev + Chromium: หน้าแรก TH/EN จอ 1440px การ์ด 10 ใบเรียงลงตัว, มือถือ 390px ไม่ล้นจอ, ไม่มี page error

## ตามมาทีหลัง

ไม่มี
