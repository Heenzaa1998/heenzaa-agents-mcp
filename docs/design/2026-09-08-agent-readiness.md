# ทำ repo ให้พร้อมสำหรับการทำงานร่วมกับ AI agent

- **วันที่:** 2026-09-08
- **สถานะ:** implemented
- **Change record:** `docs/changes/2026-09-08-agent-readiness.md`
- **ต่อจาก:** `docs/design/2026-09-08-simplify-ci-and-agent-bootstrap.md`

## ปัญหา

`AGENTS.md` และ `CLAUDE.md` กำหนดกติกาไว้ครบแล้ว แต่ไม่มีอะไรบังคับหรือช่วยให้
กติกาเกิดขึ้นจริง จากการสำรวจ repo พบช่องว่าง 5 จุด:

1. **CI ไม่รัน `pnpm test`** ทั้งที่ `pnpm check` = lint + typecheck + test
   agent แก้โค้ดจนพัง unit test ได้โดย CI ยังเขียว — ตาข่ายรั่ว
2. **ไม่มี `.claude/settings.json`** ทุกคำสั่งตรวจสอบต้องกดอนุญาตทีละครั้ง
   ซึ่งผลักให้คนเลิกอ่านแล้วกดผ่านทุกอย่าง เสียทั้ง flow และความปลอดภัย
3. **ไม่มีอะไรกั้น `main`** agent push ตรงเข้า main ได้ กฎ design-first
   จึงเป็นแค่การขอความร่วมมือ
4. **agent ไม่เห็น type error จนกว่าจะสั่งตรวจเอง** เสียหลายเทิร์นกว่าจะรู้ว่าพัง
5. **มีตัวอย่าง feature เดียวคือ `subscribers`** แต่ `AGENTS.md` เรียกร้อง
   โครง contracts/service/repository และ span chain
   `route -> service -> repository -> DB` — agent ต้องเดา pattern ใหม่ทุกครั้ง
   จึงได้หลายสไตล์จากหลายครั้ง

รวมถึงขยะ `*:Zone.Identifier` จาก WSL 73 ไฟล์ ที่ ignore ไปแล้วแต่ยังอยู่บนดิสก์
และโผล่ปนทุกครั้งที่ agent `ls`/`find`

## สิ่งที่ repo ทำถูกอยู่แล้ว (ห้ามรื้อ)

- `src/server/env.ts` validate ด้วย Zod และมี default ครบทุกตัว
  → รัน `pnpm test` ได้โดยไม่ต้องมี `.env` (ตรวจสอบแล้ว)
- feature แยก contracts/service/repository ชัด service รับ repository เป็นพารามิเตอร์
  → เทสได้โดยไม่ต้องมี DB
- `typedRoutes` เปิดอยู่
- `pnpm check` รวมสามอย่างไว้ในคำสั่งเดียว

นี่คือตาข่ายที่จับ AI ตอนเดามั่ว สำคัญกว่าการเขียน prompt ยาว ๆ

## ทางเลือกที่พิจารณา — hook typecheck

| ทางเลือก | ข้อดี | ข้อเสีย |
| --- | --- | --- |
| A: ไม่ทำ ให้ agent สั่ง `pnpm check` เอง | ไม่มีอะไรเพิ่ม | agent ลืมได้ และรู้ว่าพังช้า |
| B: PostToolUse แบบ synchronous | agent เห็น error ทันทีในเทิร์นเดียวกัน | หน่วงทุกครั้งที่แก้ไฟล์ |
| C: `asyncRewake` ทำงานเบื้องหลัง ปลุกเมื่อ error | ไม่หน่วง | กลไกซับซ้อนกว่า ยังไม่เคยพิสูจน์บน repo นี้ |

เลือก **B** เพราะเชื่อถือได้และตรวจสอบได้จริง ถ้าใช้แล้วรู้สึกหน่วงค่อยเปลี่ยนเป็น C

## ทางเลือกที่พิจารณา — คำสั่งใน hook

pipe-test บนเครื่องจริงพบว่า **`jq` ไม่ได้ติดตั้ง และ `pnpm` ไม่อยู่ใน `PATH`**
(มีแต่ `corepack`) คำสั่ง hook แบบมาตรฐานที่ใช้ `jq ... | pnpm typecheck`
จะล้มเหลวเงียบ ๆ ทุกครั้ง

จึงเปลี่ยนเป็น:

```sh
if grep -qE '"(file_path|filePath)": *"[^"]+\.tsx?"' && [ -x node_modules/.bin/tsc ]; then
  node_modules/.bin/tsc --noEmit
fi
```

- `grep` อ่าน stdin แทน `jq` → ไม่ต้องพึ่ง binary ที่อาจไม่มี
- เรียก `node_modules/.bin/tsc` ตรง ๆ แทน `pnpm` → ไม่พึ่ง `PATH`
- guard `[ -x ... ]` → ถ้ายังไม่ได้ `pnpm install` hook เงียบและ exit 0
  แทนที่จะรายงาน error ปลอมทุกครั้งที่แก้ไฟล์

## ทางที่เลือก (ภาพรวม)

1. เพิ่ม step `pnpm test` ใน job `quality`
2. `.claude/settings.json` (commit เข้า repo ใช้ร่วมกันทั้งทีม):
   allowlist เฉพาะคำสั่งอ่าน/ตรวจสอบ + deny force-push, `git reset --hard`, `rm -rf /`
   ส่วนคำสั่งที่เขียนหรือ deploy ยังถามเหมือนเดิม
3. PostToolUse hook ตามด้านบน
4. skill `.claude/skills/add-feature/` บันทึกโครง feature + กฎ span chain
   + รูปแบบเทสที่ inject repository
5. `.github/pull_request_template.md` บังคับให้ลิงก์ design doc + change record
6. ลบไฟล์ `*:Zone.Identifier`
7. เปิด branch protection บน `main`

## ไฟล์ที่แตะ

- `.github/workflows/ci.yml`, `.github/pull_request_template.md`
- `.claude/settings.json`, `.claude/skills/add-feature/SKILL.md`
- `.gitignore`, `AGENTS.md`, `CLAUDE.md`, `docs/**`

## ความเสี่ยง / ผลกระทบ

- ผลต่อ schema / API contract / observability: ไม่มี ไม่ได้แตะโค้ดแอป
- **CI อาจแดง** ถ้า unit test ที่ไม่เคยรันบน CI ไม่ผ่าน — ต้องดูผลรันจริง
- **branch protection จะทำให้ push ตรงเข้า main ไม่ได้อีก** ต้องผ่าน PR
  (ตั้งเป็นขั้นตอนสุดท้าย หลัง push งานชุดนี้เสร็จ)
- แผนถอยกลับ: ลบ `.claude/settings.json` (กลับไปถามทุกครั้ง),
  ปิด branch protection ในหน้า repo settings

## แผนตรวจสอบ

- [x] `.github/workflows/ci.yml` parse เป็น YAML ได้
- [x] `.claude/settings.json` parse เป็น JSON ได้
- [x] pipe-test คำสั่ง hook: ไฟล์ `.ts`/`.tsx` เข้าเงื่อนไข, `.md` ข้าม,
      exit code ของ `tsc` ส่งต่อออกมาจริง, และเงียบเมื่อยังไม่ได้ install
- [ ] รัน CI จริงหลัง push
