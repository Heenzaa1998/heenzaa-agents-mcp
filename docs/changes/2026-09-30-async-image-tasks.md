# งานภาพแบบ async: ไม่ทิ้งภาพที่รอเกินเวลา

- **วันที่:** 2026-09-30
- **Design doc:** `docs/design/2026-09-30-async-image-tasks.md`
- **Commit / PR:** commit ตรงเข้า `main` ตามที่เจ้าของ repo สั่ง (ไม่เปิด PR)

## เปลี่ยนอะไร

- `generate_image` / `edit_image` บันทึกประวัติเป็น `pending` พร้อม taskId ทันทีที่ KIE รับงาน
  แล้วปิดเป็น `success` (พร้อมเครดิต) หรือ `fail` (พร้อมเหตุผล) เมื่อรู้ผล
- รอครบ 240 วินาทีแล้วยังไม่เสร็จ: ไม่โยน error แล้ว ตอบกลับเป็น `pending: true` + `task_id`
  MCP บอกให้เรียก `get_task_status` ตามผล (เครดิตถูกหักครั้งเดียว)
- `get_task_status` ใช้กับงานภาพได้ (โค้ดเดิมรองรับ: เก็บใต้ `images/`, thumbnail, ปิดประวัติ)
  ปรับคำอธิบาย tool
- KIE client: `KieImageResult` เป็น `{state: "success", urls, creditsConsumed}` หรือ `{state: "pending"}`
  และรับ hook `onStarted(taskId)`; error `kie_task_timeout` ไม่มีแล้ว

## ทำไม

ภาพที่ช้ากว่า 240 วินาทีเคยถูกทิ้งทั้งที่ KIE ทำเสร็จและหักเครดิต (เสีย 24 เครดิตในวันเดียว)
และค่าใช้จ่ายในหน้า `/projects` ไม่ตรงเพราะแถวถูกบันทึกเป็น fail โดยไม่มี taskId

## ไฟล์ที่แตะ

| ไฟล์ | สิ่งที่ทำ |
| --- | --- |
| `src/server/kie/client.ts` | `pollTask` คืน pending แทนโยน timeout, `runJob` เรียก `onStarted`, `noteResult` |
| `src/features/image-generation/service.ts` | `runImageJob` ใช้ร่วมกันระหว่าง generate/edit: record pending → finish success/fail หรือคง pending |
| `src/app/api/mcp/route.ts` | ข้อความตอบเมื่อ pending, คำอธิบาย `get_task_status` |
| `tests/unit/image-generation-service.test.ts` | เทส pending ตั้งแต่เริ่ม, ปิด success/fail, คง pending เมื่อหมดเวลา |

## ต่างจากแผนตรงไหน

ไม่มี

## ตรวจสอบแล้ว

- [x] `pnpm check` — lint + typecheck + test ผ่าน (149/149)
- [ ] `pnpm e2e` — ไม่รัน (DB ร่วมกับ production)
- [ ] production: `get_task_status` กับ taskId ของภาพที่สำเร็จแล้ว (เติมหลัง deploy)

## ตามมาทีหลัง

- คลังไฟล์อ้างอิงถาวร (`upload_reference`) และ shot board ในหน้าโปรเจกต์ (แผนถัดไป)
