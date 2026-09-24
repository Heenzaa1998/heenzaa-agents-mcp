# สร้างวิดีโอด้วย Kling 2.6 แบบ async

- **วันที่:** 2026-09-24
- **Design doc:** `docs/design/2026-09-24-video-generation.md`
- **Commit / PR:** branch `feat/video-generation`

## เปลี่ยนอะไร

เพิ่ม tool `generate_video` (text-to-video และ image-to-video ด้วย Kling 2.6) ที่คืน `task_id`
ทันที และ `get_task_status` ที่เช็คสถานะงาน พองานเสร็จจะก๊อปไฟล์ขึ้น R2 ใต้ `videos/`
แล้วคืนลิงก์ 7 วัน + key

## ทำไม

ผู้ใช้อยากสร้างวิดีโอและทำให้รูปที่สร้างไว้ขยับได้ วิดีโอใช้เวลานานเกินกว่าจะรอใน request
เดียวภายใต้ลิมิต 300s ของ Vercel จึงแยกเป็นสั่งงานกับเช็คผล

## ไฟล์ที่แตะ

| ไฟล์ | สิ่งที่ทำ |
| --- | --- |
| `src/server/kie/client.ts` | เพิ่ม `startVideo()` และ `getTask()`, แยก `fetchTaskData()` ใช้ร่วมกับ `pollTask()` |
| `src/features/video-generation/contracts.ts` | ใหม่ — `generateVideoSchema`, `getTaskStatusSchema` |
| `src/features/video-generation/service.ts` | ใหม่ — `startVideo()`, `getTaskStatus()` (เลือก prefix จากชื่อโมเดล) |
| `src/app/api/mcp/route.ts` | ลงทะเบียน 2 tools ใหม่, ข้อความลิงก์ชั่วคราวเป็นกลางทั้งรูป/วิดีโอ |
| `tests/unit/video-generation-schema.test.ts`, `video-generation-service.test.ts` | ใหม่ — 18 เทส |

## ต่างจากแผนตรงไหน

ตรงตามแผน แก้แค่ข้อความใน `generate_video`: เดิมเขียนว่าใช้เวลา "ไม่กี่นาที" แต่ทดสอบจริง
ใช้ราว 9.5 นาที (เกือบทั้งหมดอยู่ในสถานะ `waiting` คือรอคิวของ KIE) จึงเปลี่ยนเป็น
"อาจนานถึงราว 10 นาที ส่วนใหญ่รอคิว" เพื่อไม่ให้ Claude บอกผู้ใช้ผิด

## ตรวจสอบแล้ว

- [x] `pnpm check` — lint + typecheck + test ผ่าน (59/59)
- [ ] `pnpm e2e` — ทดสอบ MCP ด้วย curl กับ dev server แทน
- [ ] `pnpm observability:test` — ไม่ได้รัน (ต้องใช้ Docker)
- [ ] Docker build/run — ไม่แตะ

ผลลัพธ์ / สิ่งที่ยังค้าง:
- local: `generate_video` (t2v, 5s, ไม่มีเสียง) คืน `task_id` ใน 1s; `get_task_status`
  รายงาน `waiting` ระหว่างรอ แล้วเสร็จที่ ~9.5 นาที ไฟล์ขึ้น R2 ที่ `videos/<taskId>-1.mp4`
  ลิงก์เปิดได้ 200 `video/mp4` 10.2 MB
- เรียก `get_task_status` ซ้ำหลังเสร็จใช้ ~1s และใน bucket ยังมีไฟล์เดียว (ไม่อัปซ้ำ)
- ยังไม่ได้ทดสอบ image-to-video จริง — ทำบน production หลัง merge

## ตามมาทีหลัง

- ยืนยัน image-to-video บน production (ใช้รูปใน R2 เป็น input)
- stream ไฟล์วิดีโอใหญ่ขึ้น R2 แทนการ buffer ทั้งก้อน
- ถ้าอยากให้ไม่ต้อง poll: รับ callback จาก KIE
