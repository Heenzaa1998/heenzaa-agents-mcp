# Shot board: ตรวจงานทีละช็อตบนหน้าโปรเจกต์

- **วันที่:** 2026-09-30
- **Design doc:** `docs/design/2026-09-30-shot-board.md`
- **Commit / PR:** commit ตรงเข้า `main` ตามที่เจ้าของ repo สั่ง (ไม่เปิด PR)

## เปลี่ยนอะไร

- คอลัมน์ `generations.inputs` (jsonb string[], migration `0004_classy_kitty_pryde` apply ลง Neon แล้ว):
  `edit_image` บันทึกภาพต้นทาง, `generate_video` บันทึกเฟรมแรก/เฟรมสุดท้าย/ภาพของ elements
  ลิงก์ presigned ของ bucket เราถูกแปลงกลับเป็น key (`toStoredKey`) เพื่อจับคู่กับภาพในโปรเจกต์ได้
- หน้า `/projects/[id]` เป็น shot board:
  - ส่วน **ต้นแบบ** ของโปรเจกต์ (จาก `reference_images`) พร้อม key
  - ช็อตเรียงแบบธรรมชาติ (`sortShots`: S2 ก่อน S10, ไม่มีชื่อช็อตไว้ท้ายสุด)
  - แต่ละช็อตแยกแถว **ภาพ (keyframe)** เป็น thumbnail เลื่อนแนวนอน และ **วิดีโอ (take)** เป็นการ์ด
  - การ์ดวิดีโอแสดง "ทำจาก" ภาพต้นทาง (thumbnail + ลิงก์ไปที่ภาพ) หรือ key เมื่อไม่ใช่ภาพในโปรเจกต์
  - **ตัวตรวจเฟรม** (`TakeInspector`, client): เล่น/หยุด, เลื่อนทีละ 0.5 วินาที, แตะที่ภาพเพื่อซูม 2.2 เท่า
    ตรงจุดนั้น, "ดูทีละเฟรม" เปิดแถบ 8 เฟรมด้วย media fragment `#t=` (กดเฟรมเพื่อกระโดดไป)
- ข้อความใหม่ใน i18n ทั้ง TH/EN (`projects.references`, `keyframes`, `videos`, `madeFrom`, `inspector.*`)

## ทำไม

เจ้าของงานตรวจหางยาว/กิ๊บสลับข้าง/ปากไม่ตรงเสียง ในวิดีโอเองบนมือถือได้ โดยไม่ต้องรอสคริปต์ดึงเฟรม
และเห็นว่าวิดีโอ take ไหนสร้างจากภาพไหน

## ไฟล์ที่แตะ

| ไฟล์ | สิ่งที่ทำ |
| --- | --- |
| `src/server/db/schema.ts`, `drizzle/0004_classy_kitty_pryde.sql` | คอลัมน์ `inputs` |
| `src/features/generations/contracts.ts` | `inputs` ใน `newGenerationSchema` |
| `src/features/media/contracts.ts` | `toStoredKey` |
| `src/features/image-generation/service.ts`, `src/features/video-generation/service.ts` | บันทึก inputs |
| `src/features/gallery/service.ts` | `GalleryItem` มี `inputs`, `durationSeconds` |
| `src/features/projects/service.ts` | `sortShots` |
| `src/components/take-inspector.tsx` | ใหม่ (client) |
| `src/app/projects/[id]/page.tsx` | shot board |
| `src/content/i18n/{en,th}.ts` | ข้อความใหม่ |
| tests: `references-service` (toStoredKey), `projects-service` (sortShots), image/video/generations/gallery | ปรับและเพิ่มเทส |

## ต่างจากแผนตรงไหน

ไม่มี

## ตรวจสอบแล้ว

- [x] `pnpm check` — lint + typecheck + test ผ่าน (161/161)
- [ ] `pnpm e2e` — ไม่รัน (DB ร่วมกับ production)
- [x] dev + Chromium: หน้าโปรเจกต์ "เหมียวเครื่องแกง" แสดงต้นแบบ 7 รายการ, ช็อตเรียง S01…S12,
  แถวภาพ/วิดีโอ, กด "ดูทีละเฟรม" ได้ 8 เฟรม, เลื่อน +0.5 วิ ได้ (แสดง 0.50s), มือถือ 390px ไม่ล้นจอ,
  ไม่มี page error (มี hydration warning ครั้งเดียวตอน dev compile ครั้งแรก ทำซ้ำแล้วไม่เกิด)
- [x] production (`354bb02`, มือถือ 390px): หน้า "เหมียวเครื่องแกง" แสดงต้นแบบ 7 รายการ ช็อตเรียงถูก กด "ดูทีละเฟรม" ได้ 8 เฟรม ไม่ล้นจอ ไม่มี page error

## ตามมาทีหลัง

- take เก่าก่อน migration ไม่มี "ทำจาก" (inputs ว่าง)
- ภาพนิ่งของวิดีโอฝั่ง server (ถ้ามีที่รัน ffmpeg)
