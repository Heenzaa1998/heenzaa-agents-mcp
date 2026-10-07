# ความยาวคลิปของวิดีโอพูด: อ่านจากไฟล์ MP4 ตอนเก็บ

- **วันที่:** 2026-10-07
- **Design doc:** `docs/design/2026-10-07-talking-video-duration.md`
- **Commit / PR:** branch `ccr-2e2a9845-ltgqis` merge แบบ fast-forward เข้า `main` ตามที่เจ้าของ repo สั่ง (ไม่เปิด PR)

## เปลี่ยนอะไร

- `readMp4DurationSeconds` (`src/server/storage/mp4.ts`) อ่านความยาวจาก `moov > mvhd` ของ MP4
  ไม่ต้องใช้ dependency หรือ ffmpeg
- `persistOne` อ่านความยาวของไฟล์ `videos/` ที่เพิ่งดาวน์โหลด แล้วใส่ไว้ใน `MediaItem.durationSeconds`
- `getTaskStatus` บันทึกค่านั้นลง `generations.duration_seconds` (ปัดเป็นวินาทีเต็ม อย่างน้อย 1)
  เฉพาะงานที่คำขอไม่มีความยาว ซึ่งตอนนี้คือ `generate_talking_video` ส่วน Kling ยังใช้ความยาวที่ขอไว้ตอนเริ่ม

## ทำไม

take ที่เป็นวิดีโอพูดเคยไม่มีความยาว ถ้าเลือกใช้ `get_costs` และหน้า `/projects` จะนับวินาทีที่ใช้จริงเป็น 0
แต่ยังนับเครดิตครบ ต้นทุนต่อวินาทีจึงสูงเกินจริง

## ไฟล์ที่แตะ

| ไฟล์ | สิ่งที่ทำ |
| --- | --- |
| `src/server/storage/mp4.ts` | ใหม่: อ่าน `mvhd` (v0/v1, box 64-bit, `size == 0`) |
| `src/features/media/service.ts` | `MediaItem.durationSeconds`, อ่านความยาวตอนเก็บวิดีโอ |
| `src/features/video-generation/service.ts` | `measuredSeconds`, ส่ง `durationSeconds` ไปกับ `history.finish` |
| `tests/unit/mp4.test.ts` | ใหม่ |
| `tests/unit/media-service.test.ts`, `tests/unit/video-generation-service.test.ts` | เทสเพิ่ม |
| `docs/design/2026-09-30-talking-video.md` | หมายเหตุว่าเรื่องความยาวแก้แล้ว |

## ต่างจากแผนตรงไหน

ตรงตามแผน

## ตรวจสอบแล้ว

- [x] `pnpm check` — lint + typecheck + test ผ่าน (177/177)
- [ ] `pnpm e2e` — ไม่แตะ route/page
- [ ] `pnpm observability:test` — ไม่เพิ่ม span
- [ ] Docker build/run — ไม่เกี่ยว
- [x] MP4 จริงจาก ffmpeg (H.264 + AAC) เทียบกับ ffprobe: moov ท้ายไฟล์ 4.6 = 4.6, faststart 4.6 = 4.6,
  12.034 ≈ 12.033; fragmented MP4 ได้ `undefined` ตามที่ออกแบบไว้ (ไม่บันทึกค่า ไม่ล้ม)
- [ ] production: เจน `generate_talking_video` แล้วดูว่าแถวมี `duration_seconds` (เจ้าของ repo ทำตอนทดสอบ EP02-S02)

## ตามมาทีหลัง

- วิดีโอพูดที่เสร็จก่อน commit นี้ไม่มีความยาว (ไฟล์อยู่ใน R2 แล้ว จึงไม่ได้ดาวน์โหลดใหม่)
  ถ้ามีแถวแบบนี้และได้เลือกใช้ ให้เติมค่าด้วยมือ หรือทำ backfill ที่ดึงไฟล์จาก R2 มาอ่าน
- ถ้า KIE เปลี่ยนไปส่ง fragmented MP4 ค่าจะว่างอีก ต้องอ่านจาก `mehd` หรือรวม `trun` แทน
