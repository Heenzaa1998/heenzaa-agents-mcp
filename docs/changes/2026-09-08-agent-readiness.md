# ทำ repo ให้พร้อมสำหรับการทำงานร่วมกับ AI agent

- **วันที่:** 2026-09-08
- **Design doc:** `docs/design/2026-09-08-agent-readiness.md`
- **Commit / PR:** commit `Make the repo agent-ready`

## เปลี่ยนอะไร

เพิ่ม `pnpm test` เข้า CI, เพิ่ม `.claude/settings.json` (permission allowlist +
PostToolUse typecheck hook), เพิ่ม skill `add-feature`, เพิ่ม PR template,
ลบไฟล์ขยะ `*:Zone.Identifier` 73 ไฟล์ และเปิด branch protection บน `main`

## ทำไม

กติกาใน `AGENTS.md` ไม่มีอะไรบังคับให้เกิดขึ้นจริง — CI ไม่รันเทส,
ไม่มีอะไรกั้น `main`, agent ต้องเดา pattern ของ feature ใหม่ทุกครั้ง,
และต้องกดอนุญาตทุกคำสั่งจนคนเลิกอ่าน

## ไฟล์ที่แตะ

| ไฟล์ | สิ่งที่ทำ |
| --- | --- |
| `.github/workflows/ci.yml` | เพิ่ม step `Unit tests` (`pnpm test`) |
| `.claude/settings.json` | ใหม่ — allowlist 19 รายการ, deny 4 รายการ, PostToolUse typecheck hook |
| `.claude/skills/add-feature/SKILL.md` | ใหม่ — โครง feature, กฎ span chain, รูปแบบเทส |
| `.github/pull_request_template.md` | ใหม่ — บังคับลิงก์ design doc + change record และ checklist การตรวจสอบ |
| `.gitignore` | ignore `.claude/settings.local.json` |
| `AGENTS.md` | เพิ่มหัวข้อ Tooling for agents, ชี้ไป skill, เพิ่ม `.claude/` ใน Project Shape |
| `CLAUDE.md` | เพิ่ม skill ในข้อห้ามที่ห้ามข้าม และเพิ่ม 2 แถวในตารางชี้ทาง |
| `*:Zone.Identifier` (73 ไฟล์) | ลบ |

## ต่างจากแผนตรงไหน

ตรงตามแผน แต่ระหว่างทาง pipe-test พบว่าเครื่องนี้**ไม่มี `jq` และ `pnpm` ไม่อยู่ใน
`PATH`** จึงต้องเขียนคำสั่ง hook ใหม่ให้ใช้ `grep` + `node_modules/.bin/tsc`
แทนรูปแบบมาตรฐาน `jq ... | pnpm typecheck` — บันทึกเหตุผลไว้ใน design doc แล้ว
ถ้าไม่ได้ pipe-test ก่อน hook นี้จะล้มเหลวเงียบ ๆ ทุกครั้งโดยไม่มีใครรู้

## ตรวจสอบแล้ว

- [x] `.github/workflows/ci.yml` parse เป็น YAML ได้ (steps: Lint, Typecheck, Unit tests, Security audit)
- [x] `.claude/settings.json` parse เป็น JSON ได้
- [x] pipe-test คำสั่ง hook ครบ 4 เคส: `.ts` เข้าเงื่อนไข, `.tsx` เข้าเงื่อนไข,
      `.md` ข้าม, และ exit code ของ `tsc` ส่งต่อออกมาจริง (ทดสอบด้วย stub)
- [x] ยืนยันคำสั่งยัง ทำงานถูกหลังผ่านการ escape ลง JSON แล้ว
- [x] หลังลบไฟล์ขยะ ไฟล์จริงใน `src/` + `tests/` ยังครบ 43 ไฟล์
- [ ] `pnpm check` — ไม่ได้รัน ยังไม่ได้ `pnpm install` บนเครื่องนี้
- [ ] hook ยังไม่ได้พิสูจน์ว่ายิงจริง — ต้อง `pnpm install` ก่อน และ
      Claude Code ต้องโหลด `.claude/` ใหม่ (เปิด `/hooks` หรือเริ่ม session ใหม่)

## ตามมาทีหลัง

- `pnpm install` แล้วยืนยันว่า hook ยิงจริงและ `pnpm check` ผ่าน
- พิจารณา job `pnpm e2e` แยกใน CI (ช้ากว่า ต้องลง Playwright browser)
- ถ้า hook หน่วงเกินไป เปลี่ยนเป็น `asyncRewake` ตามที่วิเคราะห์ไว้ใน design doc
