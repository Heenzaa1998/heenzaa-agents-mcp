# generate_talking_video: วิดีโอตัวละครพูด ปากตรงกับไฟล์เสียง

- **วันที่:** 2026-09-30
- **Design doc:** `docs/design/2026-09-30-talking-video.md`
- **Commit / PR:** commit ตรงเข้า `main` ตามที่เจ้าของ repo สั่ง (ไม่เปิด PR)

## เปลี่ยนอะไร

- tool ใหม่ `generate_talking_video` (Kling AI Avatar บน KIE): `image_url` + `audio_url` (URL หรือ storage key) + `prompt`,
  `mode` `standard` (`kling/ai-avatar-standard`, ค่าเริ่มต้น) หรือ `pro` (`kling/ai-avatar-pro`)
- `kieClient.startTalkingVideo` สร้าง task ด้วย `image_url`, `audio_url`, `prompt`
- ประวัติบันทึก operation `generate_talking_video`, inputs = ภาพ + เสียง (เป็น key)
- `get_task_status` เก็บผลของ avatar ลง `videos/` (`isVideoModel` แทนการเช็คคำว่า "video" ในชื่อโมเดล)

## ทำไม

ช็อตตัวละครพูดใกล้กล้องปากไม่ตรงเสียงพากย์ ถ้าให้โมเดลขยับปากตามไฟล์เสียงจริง จะใช้เสียงตัวละครเดิมของเราได้และปากตรง

## ไฟล์ที่แตะ

| ไฟล์ | สิ่งที่ทำ |
| --- | --- |
| `src/features/video-generation/contracts.ts` | `generateTalkingVideoSchema` |
| `src/features/video-generation/service.ts` | `startTalkingVideo`, prefix ของผลลัพธ์ |
| `src/server/kie/client.ts` | `AVATAR_MODELS`, `startTalkingVideo`, `isVideoModel` |
| `src/app/api/mcp/route.ts` | ลงทะเบียน tool |
| `tests/unit/video-generation-{schema,service}.test.ts` | เทสใหม่ |

## ต่างจากแผนตรงไหน

ไม่มี

## ตรวจสอบแล้ว

- [x] `pnpm check` — lint + typecheck + test ผ่าน (166/166)
- [ ] ทดสอบจริง EP02-S02 (ผลเติมหลังเจน)
