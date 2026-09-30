# คลังไฟล์อ้างอิง: อัปโหลดครั้งเดียว ใช้ด้วย key ได้ตลอด

- **วันที่:** 2026-09-30
- **สถานะ:** approved
- **Change record:** `docs/changes/2026-09-30-reference-library.md` (เติมเมื่อทำเสร็จ)

## ปัญหา

`edit_image` และ `generate_video` รับเฉพาะ URL สาธารณะ ภาพอ้างอิงตัวละครและฉาก (character sheet,
ห้องนั่งเล่น) จึงต้องถูกอัปโหลดขึ้น R2 ด้วยสคริปต์นอกระบบทุกครั้ง และลิงก์ presigned หมดอายุใน 7 วัน
พอเริ่มตอนใหม่ต้องอัปโหลดซ้ำ ผลลัพธ์ที่ระบบเก็บไว้แล้ว (`images/<task>-1.png`) ก็ต้องเรียก
`get_media_url` ก่อนทุกครั้งถึงจะเอาไปใช้ต่อได้

## ขอบเขต

**อยู่ในขอบเขต:**
- ตาราง `reference_images`: ชื่อ (เช่น `sister/main`), key ใน R2 (`refs/<name>.<ext>`), ชนิดไฟล์,
  ขนาด, กว้าง×สูง, โปรเจกต์ (ไม่บังคับ)
- MCP tool `upload_reference`: รับ **หนึ่ง**ใน `url` (https), `key` (ไฟล์ที่ระบบเก็บไว้แล้ว) หรือ
  `data_base64` ตรวจว่าเป็นภาพ PNG/JPEG/WebP ด้วย sharp แล้วเก็บลง R2 ชื่อซ้ำ = แทนที่
- MCP tool `list_references` (กรองตามโปรเจกต์ได้)
- `edit_image.image_urls`, `generate_video.image_url` / `end_image_url` / `elements[].image_urls`
  และ `get_media_url.key` รับ **storage key** ได้ นอกจาก URL ระบบ presign ให้ก่อนส่ง KIE
- สคริปต์ในเครื่อง (`imagegen/cat-family/tools/upload_ref.py`) ย่อ/แปลงไฟล์ในเครื่องเป็น JPEG แล้วส่งเป็น
  base64 ให้ tool (Vercel รับ body ได้ ~4.5 MB)

**ไม่อยู่ในขอบเขต:**
- ลบไฟล์อ้างอิง (แทนที่ด้วยชื่อเดิมได้)
- แสดงคลังในหน้าเว็บ (จะมาพร้อม shot board)
- วิดีโออ้างอิง

## ทางเลือกที่พิจารณา

| ทางเลือก | ข้อดี | ข้อเสีย |
| --- | --- | --- |
| A: ตาราง DB + key ใน R2 ใต้ `refs/` | ตั้งชื่อได้ ค้นได้ ผูกโปรเจกต์ได้ ต่อยอดหน้าเว็บง่าย | ต้อง migrate |
| B: list object จาก R2 โดยตรง (ไม่มีตาราง) | ไม่ต้อง migrate | ต้อง parse XML ของ S3, ไม่มีชื่อ/โปรเจกต์/ขนาดภาพ |
| C: ให้ผู้เรียก presign เอง (มีอยู่แล้วผ่าน `get_media_url`) | ไม่ต้องทำอะไร | ยังต้องอัปโหลดนอกระบบ และเรียก 2 รอบทุกครั้ง |

## ทางที่เลือก

**A** — ตารางเล็กมาก และการรับ key ตรงในทุก tool ทำให้ Claude สั่งว่า "ใช้ `refs/sister/main.jpg`" ได้เลย

- key ที่รับได้: `refs/...`, `images/...`, `videos/...` (รูปแบบเดียวกับที่ระบบสร้าง) URL ต้องเป็น https
- การ presign ทำในชั้น service ของภาพ/วิดีโอ ผ่าน `resolveMediaInputs` ใน feature media
  (ฉีดเข้าเทสได้)
- ชื่ออ้างอิง: ตัวพิมพ์เล็ก ตัวเลข `.`, `_`, `-` และ `/` คั่นโฟลเดอร์ ยาวไม่เกิน 120

## ความเสี่ยง

- แทนที่ชื่อเดิมด้วยไฟล์คนละนามสกุล → object เก่าค้างใน R2 (ไม่มี delete) ยอมรับได้ ขนาดเล็ก
- base64 ผ่าน MCP จำกัดที่ประมาณ 3 MB ต่อไฟล์ สคริปต์ในเครื่องย่อภาพให้ก่อน

## การทดสอบ

- unit: schema (หนึ่งแหล่งเท่านั้น, ชื่อ, key/URL), service อัปโหลดจาก url/base64 (mock fetch/store/repo),
  `resolveMediaInputs` แปลง key เป็น URL, image/video service ส่ง URL ที่ presign แล้วให้ client
- production: อัปโหลด character sheet 5 ตัว + ฉาก 2 ภาพ ด้วยสคริปต์ แล้ว `list_references` เห็นครบ
