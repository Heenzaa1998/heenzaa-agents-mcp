# ยกระดับหน้าตา Heenzaa Studio และรองรับ 2 ภาษา (ไทย/อังกฤษ)

- **วันที่:** 2026-09-28
- **สถานะ:** approved
- **Change record:** `docs/changes/2026-09-28-studio-polish-i18n.md` (เติมเมื่อทำเสร็จ)

## ปัญหา

หลังดูภาพหน้าจอธีมใหม่ ผู้ใช้ขอให้ "สวยกว่านี้" และมี 2 ภาษา หน้าแรกตอนนี้มีแต่ข้อความกับภาพจำลอง
ที่วาดด้วย CSS ไม่มีภาพจริงให้เห็นว่า studio ทำอะไรได้ gallery ครอบทุกรูปเป็นสี่เหลี่ยมจนเสีย
องค์ประกอบของภาพ และทุกข้อความเป็นภาษาอังกฤษ ขณะที่เจ้าของเว็บใช้ภาษาไทย

## ขอบเขต

**อยู่ในขอบเขต:**
- ภาพ showcase 6 ภาพ สร้างด้วย GPT Image ผ่าน KIE (สคริปต์ Python เดิม ไม่ผ่าน MCP จึงไม่ปนประวัติ)
  แปลงเป็น WebP เก็บใน `public/showcase/` เป็นไฟล์สาธารณะที่ตั้งใจเผยแพร่
- หน้าแรก: hero กับภาพเรียงซ้อน, แถบภาพเลื่อนอัตโนมัติ, tools แบบ bento, พื้นหลัง aurora + grain
- gallery แบบ masonry (สัดส่วนจริง) + overlay ตอนชี้เมาส์, หน้า login มีภาพ showcase ประกอบ
- i18n ไทย/อังกฤษทั้งเว็บ: ปุ่มสลับภาษา, cookie `lang`, ค่าเริ่มต้นไทย, `html lang`, metadata ตามภาษา
- ข้อความ error ของ server action (เช่นรหัสผิด) ตามภาษา
- ฟอนต์ไทย Anuphan

**ไม่อยู่ในขอบเขต:**
- URL แยกภาษา (`/th`, `/en`) และ SEO หลายภาษา
- แปลข้อความที่ MCP ส่งกลับให้ Claude (Claude แปลเองอยู่แล้ว)
- thumbnail ของรูปใน gallery

## ทางเลือกที่พิจารณา

| ทางเลือก | ข้อดี | ข้อเสีย |
| --- | --- | --- |
| A: cookie + dictionary ของเราเอง | ไม่เพิ่ม dependency, route เดิมใช้ได้ทั้งหมด | ไม่มี URL แยกภาษา (SEO) |
| B: segment `[lang]` + proxy ตรวจภาษา | URL แยกภาษา, SEO ดี | ย้ายทุก route, gallery/login/action ต้องรู้จัก prefix |
| C: `next-intl` | ครบเครื่อง | dependency ใหม่ + config เยอะเกินเว็บ 3 หน้า |

## ทางที่เลือก

**A** — เว็บมี 3 หน้า และส่วนสำคัญ (gallery) เป็นหน้าส่วนตัวที่ไม่ต้องการ SEO อยู่แล้ว

- dictionary อยู่ที่ `src/content/i18n/en.ts`, `th.ts` โดย `th` ต้องมี key เท่ากับ `en` (บังคับด้วย type)
- `src/server/i18n.ts`: อ่าน cookie `lang` → ถ้าไม่มีดู `Accept-Language` → ไม่ตรงอะไรใช้ `th`
- สลับภาษาผ่าน server action ที่ตั้ง cookie แล้ว refresh
- หน้าแยกเป็น `page.tsx` (async อ่านภาษา) กับ component แสดงผลที่รับ dictionary เพื่อให้เทสได้ง่าย
- ภาพ showcase ใช้ `next/image` (ไฟล์ local, ได้ขนาดที่เหมาะกับจอ) ส่วนรูปใน gallery ยังเป็น `<img>`
  เพราะ presigned URL เปลี่ยนทุกครั้ง

## แผนการทำ

1. สร้างภาพ showcase → แปลง WebP (กว้าง 1200px) → `public/showcase/` + รายการใน `site.ts`
2. i18n: dictionary, `server/i18n.ts`, action สลับภาษา, ปุ่มสลับใน header
3. ธีม: aurora/grain/grid ใน `globals.css`, ฟอนต์ Anuphan, keyframes marquee
4. หน้าแรก, gallery (masonry), login ใหม่ด้วย dictionary
5. tests: dictionary ครบ key, การเลือกภาษา, หน้าแรกทั้ง 2 ภาษา, อัปเดตเทสเดิม
6. `pnpm check`, Docker build, ภาพหน้าจอ desktop/มือถือ ทั้ง 2 ภาษา ส่งให้ผู้ใช้ก่อน merge

## ไฟล์ที่คาดว่าจะแตะ

- `public/showcase/*.webp` (ใหม่), `src/content/site.ts`, `src/content/i18n/*` (ใหม่)
- `src/server/i18n.ts`, `src/app/i18n-actions.ts` (ใหม่)
- `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/gallery/*`
- `src/components/*` (header, footer, login form, language switcher, home/gallery views)
- `tests/unit/*`, `tests/e2e/home.spec.ts`, `AGENTS.md` (UI Rules: i18n)

## ความเสี่ยง / ผลกระทบ

- **ผลต่อ schema / API contract / observability:** ไม่มี
- **หน้าแรกเป็น dynamic:** อ่าน cookie ทุก request (เดิม static) ไม่มีผลเรื่องความเร็วที่สังเกตได้
- **ขนาดหน้า:** ภาพ showcase 6 ภาพ ลดขนาดด้วย WebP + `next/image`
- **แผนถอยกลับ:** revert commit

## แผนตรวจสอบ

- [ ] `pnpm check`
- [ ] `pnpm e2e` — อัปเดตเทส ไม่รันชุดเต็ม (DB ร่วมกับ production)
- [ ] Docker build — ฟอนต์ไทยต้องโหลดได้ตอน build
- [ ] ภาพหน้าจอ desktop + มือถือ ทั้งไทยและอังกฤษ
