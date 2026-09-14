# ย้าย CI ไป GitHub Actions และตั้งระบบเอกสาร

> **หมายเหตุ (2026-09-08):** ดีไซน์นี้ถูกแทนที่บางส่วนแล้ว — job `validate`,
> `preflight` และ `image` ถูกลบออก และ `.gitea/` ถูกลบทิ้ง ดู
> `docs/design/2026-09-08-simplify-ci-and-agent-bootstrap.md`


- **วันที่:** 2026-09-08
- **Design doc:** `docs/design/2026-09-08-github-actions-and-docs.md`
- **Commit / PR:** ดู commit `docs: add design-first workflow and port CI to GitHub Actions`

## เปลี่ยนอะไร

เพิ่ม GitHub Actions workflow ที่พอร์ตมาจาก Gitea CI, สร้างโฟลเดอร์ `docs/`
พร้อมเทมเพลต design doc และ change record, และเพิ่มกติกา design-first
กับกติกาการบันทึกเอกสารลง `AGENTS.md`

## ทำไม

repo อยู่บน GitHub แล้วแต่ CI เดิมอยู่ใน `.gitea/` ซึ่ง GitHub ไม่อ่าน
ทำให้ไม่มีการตรวจใด ๆ เกิดขึ้นเลย และยังไม่มีที่เก็บเอกสารหรือกติกาว่า
ต้องวางแผนก่อนลงมือ

## ไฟล์ที่แตะ

| ไฟล์ | สิ่งที่ทำ |
| --- | --- |
| `.github/workflows/ci.yml` | ใหม่ — 4 jobs: validate, preflight, quality, image |
| `docs/README.md` | ใหม่ — กติกาการใช้ docs |
| `docs/templates/design-doc.md` | ใหม่ — เทมเพลตแผนงาน |
| `docs/templates/change-record.md` | ใหม่ — เทมเพลตบันทึกการเปลี่ยนแปลง |
| `docs/design/2026-09-08-*.md` | ใหม่ — design doc ของงานนี้เอง |
| `docs/changes/2026-09-08-*.md` | ใหม่ — ไฟล์นี้ |
| `AGENTS.md` | เพิ่ม Workflow Rules, Documentation Rules, ปรับ Project Shape / Safe Change Checklist / Avoid |
| `.gitea/workflows/ci.yaml` | ไม่แตะ — ยังใช้ได้ถ้า mirror ไป Gitea |

## ต่างจากแผนตรงไหน

ตรงตามแผน

## ตรวจสอบแล้ว

- [x] `.github/workflows/ci.yml` parse เป็น YAML ถูกต้อง (4 jobs)
- [ ] `pnpm check` — ไม่ได้รัน ไม่ได้แตะโค้ดแอป
- [ ] `pnpm e2e` — ไม่ได้รัน
- [ ] `pnpm observability:test` — ไม่ได้รัน
- [ ] Docker build/run — ไม่ได้รัน ไม่ได้แก้ `Dockerfile`

**ยังไม่ได้ยืนยัน:** workflow ยังไม่เคยรันจริงบน GitHub Actions จนจบ
ต้องดูผลรันแรกหลัง push

## ตามมาทีหลัง

- เพิ่ม `pnpm test` และ `pnpm e2e` เข้า job `quality` หลังยืนยันว่าผ่านบน CI
- ตั้ง branch protection ให้ `main` ต้องผ่าน `quality` ก่อน merge
- ตัดสินใจว่าจะเก็บ `.gitea/workflows/ci.yaml` ต่อ หรือลบทิ้งถ้าเลิกใช้ Gitea
