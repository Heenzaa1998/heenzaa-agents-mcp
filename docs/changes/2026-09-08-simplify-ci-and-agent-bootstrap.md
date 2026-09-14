# ลด CI เหลือ quality gate, ลบ Gitea, เพิ่ม CLAUDE.md

- **วันที่:** 2026-09-08
- **Design doc:** `docs/design/2026-09-08-simplify-ci-and-agent-bootstrap.md`
- **Commit / PR:** commit `Simplify CI to quality gate, drop Gitea, add CLAUDE.md`

## เปลี่ยนอะไร

ตัด GitHub Actions เหลือ job `quality` job เดียว, ลบ `.gitea/` ทิ้ง,
และเพิ่ม `CLAUDE.md` เป็นไฟล์ปฐมนิเทศที่บังคับให้ agent อ่าน `AGENTS.md`,
`package.json` และ `docs/` ก่อนตอบข้อความแรก

## ทำไม

job `image` build/push ไป Harbor + แจ้ง MiniIDP ไม่มีความหมายบน GitHub เพราะ
repo นี้ไม่ได้ deploy ผ่าน path นั้นแล้ว รันแรกก็ถูก cancel
`.gitea/` เป็นซาก CI เดิมที่ไม่มีอะไรอ่าน
และ `AGENTS.md` แม้จะครบแต่ไม่มีจุดที่บอก agent ว่า "อ่านอะไรก่อน"
ทำให้ agent เริ่มงานโดยไม่มีบริบท

## ไฟล์ที่แตะ

| ไฟล์ | สิ่งที่ทำ |
| --- | --- |
| `CLAUDE.md` | ใหม่ — ลำดับการอ่านก่อนตอบข้อความแรก, วิธีเปิดบทสนทนา, ตารางชี้ทาง |
| `.github/workflows/ci.yml` | ลบ job `validate`, `preflight`, `image` เหลือ `quality` |
| `.gitea/workflows/ci.yaml` | ลบ |
| `docs/design/2026-09-08-github-actions-and-docs.md` | เติมหมายเหตุว่าถูกแทนที่บางส่วน |
| `docs/changes/2026-09-08-github-actions-and-docs.md` | เติมหมายเหตุเดียวกัน |

## ต่างจากแผนตรงไหน

ตรงตามแผน

## ตรวจสอบแล้ว

- [x] `.github/workflows/ci.yml` parse เป็น YAML ได้ เหลือ job `quality` job เดียว
- [x] CI รันก่อนหน้านี้ยืนยันแล้วว่า job `quality` (lint + typecheck + audit) ผ่านบน GitHub
- [ ] `pnpm check` — ไม่ได้รัน ไม่ได้แตะโค้ดแอป

## ตามมาทีหลัง

- เพิ่ม `pnpm test` เข้า job `quality`
- พิจารณา job `pnpm e2e` แยก
- ตั้ง branch protection ให้ `main` ต้องผ่าน `quality` ก่อน merge
