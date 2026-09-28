# ค่าใช้จ่ายเป็นเครดิต/บาท แยกตามโปรเจกต์ ช็อต และ take

- **วันที่:** 2026-09-28
- **Design doc:** `docs/design/2026-09-28-costs-projects.md`
- **Commit / PR:** branch `feat/costs-projects`

## เปลี่ยนอะไร

- เก็บเครดิตที่ KIE คิดจริง (`creditsConsumed`) และความยาวคลิปในทุก generation งานเก่าเติมย้อนหลัง
  ด้วย `after()` หลังส่งหน้า gallery / projects
- ตาราง `projects` + คอลัมน์ `shot`, `selected` ใน generations: งานหนึ่งชิ้น = หนึ่ง take ของช็อต
  เจนซ้ำกี่รอบก็นับเป็นหลาย take เลือก take ที่ใช้จริงได้ช็อตละหนึ่งอัน
- หน้า `/projects`: เครดิตคงเหลือ (จาก KIE) เป็นบาท, อัตราบาทต่อเครดิตที่แก้ได้ (ค่าเริ่มต้น 0.165 =
  $0.005 × 33), การ์ดต่อโปรเจกต์ (ใช้ไปกี่บาท, กี่ take, ไม่สำเร็จกี่ครั้ง, ใช้จริงกี่คลิปกี่วินาที,
  บาทต่อวินาทีที่ใช้จริง) และกองงานที่ยังไม่อยู่ในโปรเจกต์
- หน้า `/projects/[id]`: แยกตามช็อต แสดงทุก take พร้อมราคา ปุ่มเลือก take
- Gallery: แต่ละการ์ดแสดงราคา และฟอร์มย้ายเข้าโปรเจกต์/ช็อต (ชื่อไม่สนตัวพิมพ์ใหญ่เล็ก)
- MCP: `generate_image`, `edit_image`, `generate_video` รับ `project` / `shot`; tool ใหม่
  `get_costs`; `list_generations` แสดงเครดิตและช็อต
- เปลี่ยน session cookie จาก `gallery_session` (path `/gallery`) เป็น `studio_session` (path `/`)
  เพื่อให้ `/projects` ใช้ได้ ผู้ใช้ต้องล็อกอินใหม่หนึ่งครั้ง

## ทำไม

ทำวิดีโอยาวต้องเจนคลิปสั้นหลายรอบแล้วเลือกมาต่อกัน อยากรู้ว่าแต่ละคลิป/ช็อตใช้ไปกี่บาทกี่รอบ
และต้นทุนจริงต่อวินาทีที่ได้ใช้

## ไฟล์ที่แตะ

| ไฟล์ | สิ่งที่ทำ |
| --- | --- |
| `src/server/db/schema.ts`, `drizzle/0002_misty_nextwave.sql` | ตาราง `projects`, `settings`; คอลัมน์ `credits`, `duration_seconds`, `project_id`, `shot`, `selected` |
| `src/server/kie/client.ts` | `getTask` คืน `creditsConsumed`, `durationSeconds`; `getBalance()` |
| `src/features/projects/*` (ใหม่) | contracts / repository / service: `summarizeCosts`, `toBaht`, rate, assign, selectTake, `backfillCosts`, `getCostReport` |
| `src/features/generations/*`, `image-generation/*`, `video-generation/*` | บันทึกเครดิต ความยาว โปรเจกต์ ช็อต |
| `src/features/gallery/service.ts` | `toGalleryItem` ใช้ร่วมกับหน้าโปรเจกต์ + ข้อมูลราคา |
| `src/app/projects/*` (ใหม่) | หน้า `/projects`, `/projects/[id]`, server actions |
| `src/app/gallery/page.tsx` | ราคาและฟอร์มย้ายเข้าโปรเจกต์บนการ์ด |
| `src/app/api/mcp/route.ts` | tool `get_costs` |
| `src/server/auth/gallery-session.ts`, `src/app/gallery/actions.ts` | `requireGallerySession()`, cookie ใหม่ path `/` |
| `src/lib/format.ts` (ใหม่), `src/content/*` | `formatBaht` (สัญลักษณ์ ฿), ข้อความ TH/EN, เมนู Projects |
| `tests/unit/projects-service.test.ts` (ใหม่) + เทสเดิม | เทส summarize, บาท, rate, assign, select, backfill, report |
| `vitest.config.mts` | `testTimeout` 15 วินาที |
| `AGENTS.md` | `/projects` เป็นหน้าส่วนตัว, กฎการแสดงเงิน |

## ต่างจากแผนตรงไหน

- คอลัมน์ `credits` เป็น `double precision` ไม่ใช่ integer เผื่อ KIE คิดเครดิตเป็นทศนิยม
- cookie ของ gallery เดิมจำกัด path `/gallery` ทำให้ `/projects` มองไม่เห็น session จึงเปลี่ยนชื่อ
  และ path (เปลี่ยนชื่อเพื่อให้ cookie เก่าถูกเมิน ไม่ค้างหลัง logout)
- เพิ่ม `testTimeout` เป็น 15 วินาที เพราะเทสที่ import โมดูลใหญ่ timeout แบบสุ่มที่ 5 วินาทีบน WSL

## ตรวจสอบแล้ว

- [x] `pnpm check` — lint + typecheck + test ผ่าน (125/125)
- [ ] `pnpm e2e` — ไม่รัน (DB ร่วมกับ production)
- [x] ทดสอบบน dev ด้วย Chromium (TH/EN, มือถือ 390px ไม่ล้นจอ, ไม่มี page error)

ผลลัพธ์ / สิ่งที่ยังค้าง:
- เติมเครดิตย้อนหลังครบ 6 งาน: วิดีโอ Kling 5 วิ = 55 เครดิต, ภาพ 1K = 6, 2K = 10; ยอดคงเหลือ 824 เครดิต ≈ ฿135.96
- ย้ายวิดีโอ 2 ชิ้นเข้าโปรเจกต์ทดสอบผ่านฟอร์ม gallery (พิมพ์ชื่อต่างตัวพิมพ์ รวมเป็นโปรเจกต์/ช็อตเดียวกัน),
  เลือก take แล้วได้ ฿18.15 / 110 เครดิต, 2 take, ใช้จริง 1 คลิป 5 วิ, ฿3.63 ต่อวินาทีที่ใช้จริง
- `get_costs` ผ่าน MCP ให้ตัวเลขตรงกับหน้าเว็บ
- ลบโปรเจกต์และการย้ายทดสอบออกจาก DB แล้ว (เครดิตที่เติมย้อนหลังเก็บไว้เพราะเป็นข้อมูลจริง)

## ตามมาทีหลัง

- ต่อคลิปที่เลือกเป็นวิดีโอเดียว (ต้องใช้ ffmpeg)
