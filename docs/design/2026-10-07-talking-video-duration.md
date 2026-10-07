# ความยาวคลิปของวิดีโอพูด: อ่านจากไฟล์ MP4 ตอนเก็บ

- **วันที่:** 2026-10-07
- **สถานะ:** implemented
- **Change record:** `docs/changes/2026-10-07-talking-video-duration.md`

## ปัญหา

`generate_talking_video` บันทึกประวัติโดยไม่มี `durationSeconds` เพราะความยาวคลิปขึ้นกับไฟล์เสียง
และ KIE ไม่ส่งค่านี้มาใน `param` (Kling 3.0/2.6 มี `duration` จากคำขอ ส่วน avatar ไม่มี)

ผลคือถ้าเลือก take ที่เป็นวิดีโอพูด รายงานค่าใช้จ่าย (`summarizeCosts`, `get_costs`, หน้า `/projects`)
จะนับ "วินาทีที่ใช้จริง" ของ take นั้นเป็น 0 แต่ยังนับเครดิตครบ ต้นทุนต่อวินาทีจึงสูงเกินจริง
ตัวตรวจเฟรมในหน้าโปรเจกต์ก็ไม่รู้ความยาวจนกว่าเบราว์เซอร์จะโหลดวิดีโอ

## ขอบเขต

**อยู่ในขอบเขต:**
- อ่านความยาวจาก movie header (`moov` > `mvhd`) ของไฟล์ MP4 ตอนที่ `get_task_status` ดาวน์โหลดผลมาเก็บใน R2
- บันทึกค่านั้นลง `generations.duration_seconds` เฉพาะงานที่คำขอไม่มีความยาว (วิดีโอพูด)
  ปัดเป็นวินาทีเต็ม อย่างน้อย 1 วินาที (คอลัมน์และ contract เป็น int บวก)

**ไม่อยู่ในขอบเขต:**
- เติมความยาวให้วิดีโอพูดที่เสร็จไปแล้วก่อนงานนี้: ไฟล์อยู่ใน R2 แล้ว `persistOne` จึงไม่ดาวน์โหลดซ้ำ
  ต้องเขียน backfill ที่ดึงไฟล์จาก R2 มาอ่าน ถ้ามีแถวแบบนี้จริงค่อยทำ (ดู "ตามมาทีหลัง" ใน change record)
- เปลี่ยนค่าที่ Kling 3.0/2.6 บันทึกไว้ตอนเริ่มงาน (ความยาวที่ขอ ซึ่งตรงกับไฟล์อยู่แล้ว)

## ทางเลือกที่พิจารณา

| ทางเลือก | ข้อดี | ข้อเสีย |
| --- | --- | --- |
| A: อ่าน `mvhd` จาก bytes ของ MP4 ตอนเก็บไฟล์ | ไม่ต้องโหลดอะไรเพิ่ม (bytes อยู่ในมือแล้ว), ไม่มี dependency, ~50 บรรทัด | แถวเก่าไม่ได้ค่า |
| B: อ่านความยาวไฟล์เสียงตอนเริ่มงาน | รู้ค่าตั้งแต่ต้น | ต้องดาวน์โหลดเสียงและ parse MP3/WAV/AAC/OGG (MP3 VBR ยาก) |
| C: backfill หลังโหลดหน้าเว็บ ดึง MP4 จาก R2 มาอ่าน | ครอบคลุมแถวเก่าด้วย | ดาวน์โหลดไฟล์ซ้ำ, ค่าขึ้นเฉพาะหลังมีคนเปิดหน้า, โค้ดเพิ่ม repository + hook |
| D: ffprobe | แม่นทุก format | Vercel ไม่มี ffmpeg, binary ใหญ่ |

## ทางที่เลือก

**A** — ได้ค่าทันทีที่งานเสร็จ ทั้งผ่าน MCP และปุ่ม "Check" ในแกลเลอรี (ทั้งคู่เรียก `getTaskStatus`)
`mvhd` เป็นส่วนบังคับของ MP4 ทุกไฟล์ที่ไม่ใช่ fragmented ซึ่ง KIE ส่งมาเป็น MP4 ธรรมดา
ถ้าอ่านไม่ได้ก็แค่ไม่บันทึก (เหมือนตอนนี้) ไม่ทำให้การเก็บไฟล์หรือ tool ล้ม

## แผนการทำ

1. `src/server/storage/mp4.ts`: `readMp4DurationSeconds(bytes)` เดิน box ระดับบน หา `moov` แล้ว `mvhd`
   รองรับ `mvhd` version 0/1, box ขนาด 64-bit (`size == 1`) และ `size == 0` (ถึงท้ายไฟล์)
   คืน `undefined` เมื่อไม่ใช่ MP4, ไม่มี header, ไฟล์ขาด, timescale = 0 หรือ duration ไม่รู้ค่า
2. `persistOne` (feature media): ไฟล์ `videos/` ที่เพิ่งดาวน์โหลด ใส่ `durationSeconds` ใน `MediaItem`
3. `getTaskStatus`: ถ้า KIE ไม่มีความยาวจากคำขอ (`status.durationSeconds === undefined`)
   ใช้ค่าที่อ่านได้ ปัดเป็นวินาทีเต็ม ส่งไปกับ `history.finish`
4. เทส: parser (v0, v1, largesize, moov ท้ายไฟล์, ไม่ใช่ MP4, ไฟล์ขาด), persist, getTaskStatus

## ไฟล์ที่คาดว่าจะแตะ

- `src/server/storage/mp4.ts` (ใหม่)
- `src/features/media/service.ts`
- `src/features/video-generation/service.ts`
- `tests/unit/mp4.test.ts` (ใหม่), `tests/unit/media-service.test.ts`, `tests/unit/video-generation-service.test.ts`

## ความเสี่ยง / ผลกระทบ

- ผลต่อ schema: ไม่มี (`duration_seconds` มีอยู่แล้ว, `generationOutcomeSchema` รับ `durationSeconds` อยู่แล้ว)
- ผลต่อ API contract: ไม่มี ข้อความตอบของ tool เหมือนเดิม
- ผลต่อ observability: ไม่เพิ่ม span
- ถ้าค่าที่อ่านได้ไม่ใช่ int บวก `finishGeneration` จะ parse ไม่ผ่านแล้วทิ้งการบันทึกผลทั้งแถว จึงต้องปัดและบังคับ ≥ 1 ก่อนส่ง
- แผนถอยกลับ: revert commit เดียว แถวที่ได้ค่าไปแล้วไม่ต้องแก้

## แผนตรวจสอบ

- [x] `pnpm check`
- [ ] `pnpm e2e` — ไม่แตะ route/page
- [x] อ่านความยาวจาก MP4 จริงที่เข้ารหัสด้วย ffmpeg (ถ้ามีในเครื่อง) ให้ตรงกับที่ ffprobe บอก
