# generate_talking_video: วิดีโอตัวละครพูด ปากตรงกับไฟล์เสียง

- **วันที่:** 2026-09-30
- **สถานะ:** approved
- **Change record:** `docs/changes/2026-09-30-talking-video.md`

## ปัญหา

`generate_video` (Kling 3.0) สร้างภาพเคลื่อนไหวก่อน แล้วเราค่อยวางเสียงพากย์ (ElevenLabs) ทับตอนตัดต่อ
ปากตัวละครเลยขยับไม่ตรงกับเสียง เห็นชัดในช็อตหน้าใกล้กล้องที่พูดยาว
KIE มี Kling AI Avatar ที่รับ **ภาพ + ไฟล์เสียง** แล้วทำให้ปากขยับตามเสียงนั้น (รองรับตัวการ์ตูน/สัตว์)
จึงใช้เสียงตัวละครของเราเองต่อได้

## ขอบเขต

**อยู่ในขอบเขต:**
- tool ใหม่ `generate_talking_video`: `image_url`, `audio_url`, `prompt`, `mode` (`standard` 720p ค่าเริ่มต้น | `pro` 1080p), `project`, `shot`
  - โมเดล KIE: `kling/ai-avatar-standard` / `kling/ai-avatar-pro`
  - `image_url` และ `audio_url` เป็น https URL หรือ storage key ก็ได้ (ไฟล์เสียงอัปขึ้น `refs/...mp3` ได้)
- คืน task_id ทันที แล้วใช้ `get_task_status` ตัวเดิมรับผล (KIE jobs API เดียวกัน)
- `get_task_status` เก็บผลของ avatar ลง `videos/` (เดิมเลือกโฟลเดอร์จากคำว่า "video" ในชื่อโมเดล ซึ่งไม่มีในชื่อ avatar)
- บันทึกประวัติ kind `video`, operation `generate_talking_video`, inputs = ภาพ + เสียง

**ไม่อยู่ในขอบเขต:**
- อัปโหลดไฟล์เสียงผ่าน MCP (ใช้ R2 โดยตรงจากเครื่องไปก่อน; `upload_reference` รับแต่ภาพ)
- ความยาวคลิปในประวัติ: KIE ไม่ส่งค่า duration สำหรับ avatar (ขึ้นกับความยาวเสียง) จึงเว้นว่าง

## ทางเลือกที่พิจารณา

| ทางเลือก | ข้อดี | ข้อเสีย |
| --- | --- | --- |
| A: tool ใหม่ `generate_talking_video` | พารามิเตอร์ชัด ไม่มี duration/end frame ที่ใช้ไม่ได้ | tool เพิ่ม 1 ตัว |
| B: เพิ่ม `model: kling-avatar` + `audio_url` ใน `generate_video` | tool เดียว | กฎ schema ซับซ้อนขึ้นมาก (ห้าม duration, end frame, elements, sound ฯลฯ) |

## ทางที่เลือก

**A** — ข้อมูลเข้าต่างจาก Kling 3.0 เกือบทั้งหมด แยก tool แล้วผู้เรียกไม่สับสน

## ความเสี่ยง

- ราคาบน KIE ยังไม่ได้ยืนยัน ดูจาก `generations.credits` ของงานแรก
- ภาพแนวตั้ง 9:16 อาจถูกครอป/เปลี่ยนสัดส่วน ต้องดูจากผลจริง

## การทดสอบ

- unit: schema (ต้องมีทั้งภาพและเสียง, mode), service ส่งโมเดล/ข้อมูลถูกและบันทึกประวัติ, get_task_status เก็บผล avatar ลง `videos/`
- ทดสอบจริง 1 ช็อต (EP02-S02: ขมิ้นพูด 4.6 วินาที)
