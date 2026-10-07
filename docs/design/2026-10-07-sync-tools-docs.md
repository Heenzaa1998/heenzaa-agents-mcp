# หน้าแรก คำอธิบาย tool และ README ให้ตรงกับ tool ที่มีจริง

- **วันที่:** 2026-10-07
- **สถานะ:** implemented
- **Change record:** `docs/changes/2026-10-07-sync-tools-docs.md`

## ปัญหา

MCP server มี tool 10 ตัว แต่หลายจุดยังเขียนตามสมัยที่มี 6 ตัว:

- หน้าแรก (`src/content/site.ts` + i18n) ยังเขียนว่า "Six tools" ไม่มี `upload_reference`, `list_references`,
  `generate_talking_video`, `get_costs` และยังบอกว่าใช้ Kling 2.6 ทั้งที่ค่าเริ่มต้นเป็น Kling 3.0 แล้ว
  ขัดกับกติกาใน `AGENTS.md` ที่ให้หน้าแรกตรงกับของจริง
- คำอธิบาย tool ที่ Claude อ่านตอนเลือกว่าจะเรียกอะไร บางตัวล้าหลัง: `get_media_url` บอกว่าใช้ได้แค่ไฟล์ของ
  `generate_image`/`edit_image`, `get_task_status.task_id` บอกว่ามาจาก `generate_video` อย่างเดียว,
  `list_generations` บอกว่า pending มีแต่วิดีโอ (ภาพก็ pending ได้ตั้งแต่ async image tasks)
- `README.md` ยังเป็นของ template: อ้างหน้า `/guide`, `/operations` และ `subscribe-form` ที่ลบไปแล้ว
  ไม่ได้บอกว่าโปรเจกต์นี้คืออะไร หรือต้องตั้ง env อะไร (KIE, R2, token, รหัส gallery)

ต้นเหตุคือไม่มีอะไรผูกรายชื่อบนหน้าแรกกับ tool ที่ลงทะเบียนจริง ทุกครั้งที่เพิ่ม tool จึงต้องจำเอง

## ขอบเขต

**อยู่ในขอบเขต:**
- `toolNames` ครบ 10 ตัว พร้อมคำอธิบาย TH/EN, ไอคอน, และ layout ของการ์ดที่ลงตัวกับ 10 ใบ
- จำนวน tool ในหัวข้อคำนวณจาก `toolNames.length` แทนการพิมพ์ตัวเลข
- ชื่อโมเดลบนหน้าแรก (chips, intro, ขั้นตอน "สร้าง") เป็น GPT Image 2 / Kling 3.0 / Kling AI Avatar
- unit test ที่อ่าน `src/app/api/mcp/route.ts` แล้วเทียบชื่อ tool ที่ `registerTool` กับ `toolNames`
- แก้คำอธิบาย tool/field ที่ล้าหลังตามรายการข้างบน
- เขียน `README.md` ใหม่ให้เป็นของ Heenzaa Studio
- กติกาใน `AGENTS.md`: `toolNames` ต้องตรงกับ tool ที่ลงทะเบียน

**ไม่อยู่ในขอบเขต:**
- เปลี่ยนชื่อ `serverInfo.name` (`heenzaa-image-mcp`) หรือชื่อแพ็กเกจ: client อาจผูกกับชื่อเดิม ไม่มีปัญหาจริงที่ต้องแก้
- เปลี่ยนพฤติกรรมของ tool ใด ๆ (แก้เฉพาะข้อความ)

## ทางเลือกที่พิจารณา

| ทางเลือก | ข้อดี | ข้อเสีย |
| --- | --- | --- |
| A: แก้รายชื่อด้วยมือ + เทสเทียบกับ source ของ route | เล็ก ไม่ต้องแตะโค้ดลงทะเบียน | เทสอ่าน source ด้วย regex |
| B: ให้ route ลงทะเบียน tool จากรายการกลางใน `site.ts` | รายชื่อมีที่เดียว | ต้องรื้อ route ทั้งไฟล์ ผูก content กับ server |

## ทางที่เลือก

**A** — ปัญหาคือ "ลืมอัปเดต" ไม่ใช่ "โค้ดซ้ำ" เทสที่ fail ทันทีเมื่อเพิ่ม tool แล้วไม่เพิ่มบนหน้าแรกก็พอ
และไม่ต้องย้ายโค้ดที่ทำงานดีอยู่แล้ว

## แผนการทำ

1. `site.ts`: `toolNames` 10 ตัว เรียงเป็นกลุ่ม (สร้างงาน 4 ตัว แล้วคลังไฟล์ 3 ตัว แล้วติดตาม 3 ตัว), `models` ใหม่
2. i18n EN/TH: `toolsTitle` เป็นฟังก์ชันรับจำนวน, คำอธิบาย tool ใหม่ 4 ตัว, แก้ intro/steps/`referencesHelp`
3. `home-view.tsx`: ไอคอนใหม่, การ์ดใหญ่สูง 3 แถว + 3 ใบข้าง ๆ แล้ว 6 ใบที่เหลือแถวละ 3
4. เทส: `home-page.test.tsx` เทียบกับ `registerTool` ใน route
5. คำอธิบาย tool/field, `README.md`, `AGENTS.md`

## ไฟล์ที่คาดว่าจะแตะ

- `src/content/site.ts`, `src/content/i18n/{en,th}.ts`, `src/components/home-view.tsx`
- `src/app/api/mcp/route.ts`, `src/features/video-generation/contracts.ts`, `src/features/generations/contracts.ts`
- `tests/unit/home-page.test.tsx`
- `README.md`, `AGENTS.md`

## ความเสี่ยง / ผลกระทบ

- ผลต่อ schema: ไม่มี
- ผลต่อ API contract: แก้แค่ข้อความ description ไม่เปลี่ยนชื่อ field หรือกฎ validate
- ผลต่อ observability: ไม่มี
- แผนถอยกลับ: revert commit เดียว

## แผนตรวจสอบ

- [x] `pnpm check`
- [ ] `pnpm e2e` — ไม่รัน (DB ร่วมกับ production) แต่เทส e2e หน้าแรกเช็คแค่หัวข้อ, ลิงก์ gallery และ `generate_video` ซึ่งยังอยู่
- [x] เปิดหน้าแรกใน dev ทั้ง TH/EN จอกว้างและมือถือ ดูว่าการ์ด 10 ใบลงตัว
