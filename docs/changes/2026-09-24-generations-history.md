# บันทึกประวัติงานสร้างรูป/วิดีโอ (`generations`)

- **วันที่:** 2026-09-24
- **Design doc:** `docs/design/2026-09-24-generations-history.md`
- **Commit / PR:** branch `feat/generations-history`

## เปลี่ยนอะไร

เพิ่มตาราง `generations` บน Neon และ feature `generations` (contracts / repository / service)
ทุก tool สร้างรูป/วิดีโอบันทึกประวัติเองอัตโนมัติ ทั้งตอนสำเร็จและตอนล้ม และเพิ่ม tool
`list_generations` ค้นงานเก่าตามประเภท สถานะ และคำใน prompt

## ทำไม

key ใน R2 และ `task_id` ของวิดีโอเคยมีอยู่แค่ในแชท และงานที่ล้มไม่มีร่องรอยให้ตามต่อ
ข้อมูลชุดนี้ยังเป็นฐานให้หน้า gallery ที่จะทำต่อ

## ไฟล์ที่แตะ

| ไฟล์ | สิ่งที่ทำ |
| --- | --- |
| `src/server/db/schema.ts` | เพิ่มตาราง `generations` + type `StoredMediaRef` |
| `drizzle/0001_loving_synch.sql`, `drizzle/meta/*` | migration (generated) |
| `src/features/generations/contracts.ts`, `repository.ts`, `service.ts` | ใหม่ — schema, query ห่อ `withDatabaseSpan`, `recordGeneration`/`finishGeneration` (ไม่ throw), `listGenerations` |
| `src/features/image-generation/service.ts` | บันทึก success/fail (inject `history` ได้) |
| `src/features/video-generation/service.ts` | บันทึก pending ตอนเริ่ม, อัปเดต success/fail ตอนเช็คสถานะ |
| `src/app/api/mcp/route.ts` | ลงทะเบียน `list_generations` |
| `tests/unit/generations-schema.test.ts`, `generations-service.test.ts` | ใหม่ |
| `tests/unit/image-generation-service.test.ts`, `video-generation-service.test.ts` | inject history stub + เช็คการบันทึก |

## ต่างจากแผนตรงไหน

ตรงตามแผน skill `add-feature` โหลดใน session นี้ไม่ได้ (session เปิดอยู่นอก repo) จึงทำตามเนื้อหา
ของ skill ที่อ่านไว้แทน

## ตรวจสอบแล้ว

- [x] `pnpm check` — lint + typecheck + test ผ่าน (79/79)
- [ ] `pnpm e2e` — ไม่รัน (จะเขียนลง DB ที่ใช้ร่วมกับ production) ทดสอบด้วย curl แทน
- [ ] `pnpm observability:test` — ไม่ได้รัน (ต้องใช้ Docker)
- [ ] Docker build/run — ไม่แตะ
- [x] Migration generated and applied — `0001` apply ลง Neon แล้ว

ผลลัพธ์ / สิ่งที่ยังค้าง:
- local: `generate_image` สำเร็จ → บันทึก `success` พร้อม key; `edit_image` ด้วยรูปที่ KIE โหลดไม่ได้
  → บันทึก `fail` พร้อมเหตุผลจาก KIE; `list_generations` แสดงครบ, filter `query`+`status` ถูก,
  ค้น `%` ได้ผลว่าง (escape ทำงาน)
- ลบแถวทดสอบแล้ว (ไฟล์รูปทดสอบยังอยู่ใน R2 ที่ `images/c730…-1.png`)
- ยืนยันบน production หลัง merge

## ตามมาทีหลัง

- หน้า gallery + login (อาจใช้ Neon Auth ที่ integration เปิดมาให้)
- ถ้าประวัติโตมาก: index ที่ `created_at` และ full-text search ใน prompt
