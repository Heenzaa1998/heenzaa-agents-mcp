# บันทึกประวัติงานสร้างรูป/วิดีโอ (`generations`)

- **วันที่:** 2026-09-24
- **สถานะ:** approved
- **Change record:** `docs/changes/2026-09-24-generations-history.md` (เติมเมื่อทำเสร็จ)

## ปัญหา

key ของไฟล์ใน R2 และ `task_id` ของวิดีโอมีอยู่แค่ในแชท ถ้าแชทหายก็หางานเก่าไม่เจอ งานที่ล้มก็
ไม่มีร่องรอยว่าล้มเพราะอะไร (เช่นเคสปริศนาตอนทดสอบวิดีโอบน production) และหน้า gallery ที่จะทำ
ต่อต้องมีข้อมูลให้แสดง

## ขอบเขต

**อยู่ในขอบเขต:**
- ตาราง `generations` บน Neon + Drizzle migration
- feature `generations` ตามแบบ `add-feature`: contracts / repository / service
- บันทึกอัตโนมัติ: `generate_image`, `edit_image` (สำเร็จหรือล้ม), `generate_video` (pending),
  `get_task_status` (อัปเดตเป็น success/fail)
- tool `list_generations`: ค้นงานเก่าตามประเภท สถานะ และคำใน prompt
- unit tests

**ไม่อยู่ในขอบเขต:**
- หน้า UI gallery และระบบ login
- ลบ/แก้ประวัติผ่าน tool
- แยก Neon branch สำหรับ dev

## ทางเลือกที่พิจารณา

| ทางเลือก | ข้อดี | ข้อเสีย |
| --- | --- | --- |
| A: บันทึกใน service ของแต่ละ feature (inject logger ได้) | อยู่ใกล้ business logic, รู้ model/prompt/ผลลัพธ์ครบ, เทสด้วย stub ได้ | service ของรูป/วิดีโอขึ้นกับ feature `generations` |
| B: บันทึกใน route MCP | ไม่แตะ service | ผิดกฎ repo (ห้ามมี logic ใน route) |
| C: เก็บผ่าน log ของ Vercel | ไม่ต้องมีตาราง | ค้นย้อนหลังจาก MCP ไม่ได้ และ log หมดอายุ |

## ทางที่เลือก

**A** — service ของรูป/วิดีโอรับ `generationLog` แบบ inject ได้ (ค่า default = ตัวจริง) เหมือนที่รับ
client และ persist อยู่แล้ว

- **การบันทึกห้ามทำให้งานหลักล้ม:** ถ้า DB มีปัญหา ให้ log warn แล้วไปต่อ เพราะผู้ใช้จ่าย credit ไปแล้ว
- ตาราง: `id`, `kind` (image/video), `operation`, `model`, `prompt`, `status` (pending/success/fail),
  `task_id` (unique, ว่างได้ถ้าล้มก่อนได้ task), `media` (jsonb: รายการ `{ key, url }` เก็บ `url`
  เฉพาะไฟล์ที่ไม่ได้ขึ้น R2), `error`, `created_at`, `updated_at`
- เก็บ **key** ไม่เก็บ presigned URL เพราะลิงก์หมดอายุ ใช้ `get_media_url` ขอลิงก์ใหม่ได้
- วิดีโอ: `generate_video` สร้างแถว `pending`; `get_task_status` อัปเดตตาม `task_id` ถ้าไม่มีแถว
  (งานก่อนมีฟีเจอร์นี้) ก็ข้ามไป
- `list_generations`: filter `kind`, `status`, `query` (ILIKE ใน prompt, escape `%` `_`), `limit` 1–50
  (default 10) เรียงใหม่สุดก่อน

## แผนการทำ

1. `src/server/db/schema.ts` เพิ่มตาราง + `pnpm db:generate` + `pnpm db:migrate`
2. `src/features/generations/contracts.ts`, `repository.ts`, `service.ts`
3. แก้ `image-generation/service.ts`, `video-generation/service.ts` ให้บันทึก
4. `src/app/api/mcp/route.ts` ลงทะเบียน `list_generations`
5. tests: `generations-schema`, `generations-service` + อัปเดตเทสรูป/วิดีโอ
6. `pnpm check`, ทดสอบจริง (สร้างรูป → เห็นใน `list_generations`), ลบแถวทดสอบ
7. PR → merge → ยืนยัน production

## ไฟล์ที่คาดว่าจะแตะ

- `src/server/db/schema.ts`, `drizzle/*` (generated)
- `src/features/generations/contracts.ts`, `repository.ts`, `service.ts` (ใหม่)
- `src/features/image-generation/service.ts`, `src/features/video-generation/service.ts`
- `src/app/api/mcp/route.ts`
- `tests/unit/generations-schema.test.ts`, `generations-service.test.ts` (ใหม่)
- `tests/unit/image-generation-service.test.ts`, `video-generation-service.test.ts`
- `docs/changes/2026-09-24-generations-history.md` (ใหม่)

## ความเสี่ยง / ผลกระทบ

- **ผลต่อ schema:** เพิ่มตาราง `generations` (migration ใหม่ ไม่แตะ `subscribers`)
- **ผลต่อ API contract:** เพิ่ม tool `list_generations`; tools เดิมไม่เปลี่ยนรูปแบบ
- **ผลต่อ observability:** span DB ใหม่ `db.generations.*` ผ่าน `withDatabaseSpan`
  attribute low-cardinality ไม่ใส่ prompt หรือ task id
- **เวลา:** เพิ่ม query ต่อ tool call 1 ครั้ง (HTTP ไป Neon ใน region เดียวกัน)
- **ความเป็นส่วนตัว:** prompt ถูกเก็บในฐานข้อมูล (endpoint มี token อยู่แล้ว)
- **DB ร่วมกับ production:** แถวที่ทดสอบจากเครื่องต้องลบทิ้งหลังทดสอบ
- **แผนถอยกลับ:** revert commit; ตารางที่เหลืออยู่ไม่มีผลกับโค้ดเดิม

## แผนตรวจสอบ

- [ ] `pnpm check`
- [ ] `pnpm e2e` — ไม่รัน (เขียนลง DB production) ทดสอบด้วย curl แทน
- [ ] `pnpm observability:test` — ไม่รัน (ต้องใช้ Docker) span ตามแพตเทิร์นเดิม
- [ ] Docker build/run — ไม่แตะ
- [ ] Migration generated and applied
- [ ] ทดสอบจริง local + production
