# สร้างวิดีโอด้วย Kling 2.6 แบบ async

- **วันที่:** 2026-09-24
- **สถานะ:** approved
- **Change record:** `docs/changes/2026-09-24-video-generation.md` (เติมเมื่อทำเสร็จ)

## ปัญหา

MCP server สร้างได้แค่รูป ผู้ใช้อยากสร้างวิดีโอจากข้อความ และทำให้รูปที่สร้างไว้ขยับได้
แต่วิดีโอใช้เวลาสร้างนานกว่ารูปมาก ถ้ารอแบบ synchronous เหมือน `generate_image`
เสี่ยงเกินลิมิต 300s ของ Vercel

## ขอบเขต

**อยู่ในขอบเขต:**
- tool `generate_video`: สั่งสร้างแล้วคืน `task_id` ทันที ไม่รอผล
- tool `get_task_status`: เช็คสถานะหนึ่งครั้ง ถ้าเสร็จแล้วก๊อปไฟล์ขึ้น R2 (`videos/`) แล้วคืนลิงก์ + key
- text-to-video (`kling-2.6/text-to-video`) และ image-to-video (`kling-2.6/image-to-video`)
- KIE client เพิ่มการสั่งงานแบบไม่รอ + อ่านสถานะงานครั้งเดียว
- unit tests + ทดสอบจริง

**ไม่อยู่ในขอบเขต:**
- เปลี่ยน `generate_image` / `edit_image` เป็น async (ยังเร็วพอ)
- callback/webhook จาก KIE
- โมเดลวิดีโออื่น (Sora 2, Veo, Runway) และการเลือกโมเดลผ่าน input
- stream ไฟล์วิดีโอขึ้น R2 แทนการ buffer

## ทางเลือกที่พิจารณา

| ทางเลือก | ข้อดี | ข้อเสีย |
| --- | --- | --- |
| A: sync (สั่ง+รอในคำขอเดียว) | ใช้ครั้งเดียวจบ | วิดีโอนานเสี่ยง timeout 300s, ค้างการเชื่อมต่อนาน |
| B: async สองขั้น (`generate_video` + `get_task_status`) | ไม่ติด timeout, Claude poll เองได้ | ต้องเรียกสองครั้งขึ้นไป |
| C: async + KIE callback webhook | ไม่ต้อง poll | ต้องมี endpoint รับ callback + ยืนยันที่มา และยังต้องมีที่เก็บสถานะ |

โมเดล: Kling 2.6 (มีทั้ง t2v และ i2v บน jobs API เดียวกัน เอกสารครบ) vs Sora 2
(เอกสาร KIE เปิดไม่ได้ในวันที่ออกแบบ) vs Veo 3.1 / Runway (ใช้ endpoint แยก ต้องเขียน client ใหม่)

## ทางที่เลือก

**B + Kling 2.6** — ไม่ต้องมี state ฝั่งเรา เพราะ KIE เก็บสถานะงานไว้ให้ และ key ใน R2 คงที่ตาม
taskId ทำให้เรียก `get_task_status` ซ้ำหลังเสร็จกี่ครั้งก็ไม่อัปซ้ำ (ใช้ `persistRemoteMedia` เดิม)

- ถ้ามี `image_url` ใช้ image-to-video (สัดส่วนภาพตามรูปต้นฉบับ) ไม่มีใช้ text-to-video
- `sound` default `false` (มีเสียงแพงกว่า)
- `get_task_status` เลือก prefix จากชื่อโมเดลที่ KIE คืนมา (มีคำว่า `video` → `videos/`
  นอกนั้น `images/`) จึงใช้กับงานรูปได้ด้วย
- งานล้มเหลวคืนเป็นผลลัพธ์ `isError` พร้อมเหตุผลจาก KIE ไม่ throw

## แผนการทำ

1. `src/server/kie/client.ts` — เพิ่ม `startVideo()` (createTask อย่างเดียว) และ `getTask()`
   (recordInfo ครั้งเดียว คืน state/progress/urls/failMsg) โดยใช้ createTask/parseResultUrls เดิม
2. `src/features/video-generation/contracts.ts` — `generateVideoSchema`, `getTaskStatusSchema`
3. `src/features/video-generation/service.ts` — `startVideo()` และ `getTaskStatus()` (inject client/persist)
4. `src/app/api/mcp/route.ts` — ลงทะเบียน `generate_video`, `get_task_status`; ข้อความลิงก์ชั่วคราว
   ให้เป็นกลางทั้งรูปและวิดีโอ
5. tests: `video-generation-schema`, `video-generation-service`
6. `pnpm check` + ทดสอบจริงในเครื่อง (t2v) และบน production (i2v จากรูปใน R2)

## ไฟล์ที่คาดว่าจะแตะ

- `src/server/kie/client.ts`
- `src/features/video-generation/contracts.ts`, `service.ts` (ใหม่)
- `src/app/api/mcp/route.ts`
- `tests/unit/video-generation-schema.test.ts`, `video-generation-service.test.ts` (ใหม่)
- `docs/changes/2026-09-24-video-generation.md` (ใหม่)

## ความเสี่ยง / ผลกระทบ

- **ผลต่อ schema:** ไม่มี
- **ผลต่อ API contract:** เพิ่ม 2 tools; tools เดิมเปลี่ยนแค่ข้อความลิงก์ชั่วคราว
- **ผลต่อ observability:** span ใหม่ `video-generation.*`, `kie.start_video`, `kie.get_task`
  attribute low-cardinality (model, state) ไม่ใส่ taskId/prompt
- **ค่าใช้จ่าย:** วิดีโอกิน credit มากกว่ารูปหลายเท่า endpoint มี token ป้องกันอยู่แล้ว
- **หน่วยความจำ:** buffer ไฟล์วิดีโอทั้งก้อนตอนก๊อปขึ้น R2 คลิป 5–10s ยังเล็กพอ
- **image-to-video:** KIE รับรูป JPEG/PNG ไม่เกิน 10MB ลิงก์ presigned จาก R2 ใช้ได้เพราะ KIE แค่ GET
- **แผนถอยกลับ:** revert commit (ไม่มี state หรือ migration ค้าง)

## แผนตรวจสอบ

- [ ] `pnpm check`
- [ ] `pnpm e2e` — ทดสอบ MCP ด้วย curl แทน
- [ ] `pnpm observability:test` — ไม่รัน (ต้องใช้ Docker)
- [ ] Docker build/run — ไม่แตะ
- [ ] ทดสอบจริง: t2v จนได้วิดีโอใน R2 (local), i2v จากรูปใน R2 (production)
