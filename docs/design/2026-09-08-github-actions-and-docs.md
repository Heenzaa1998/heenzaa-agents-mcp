# ย้าย CI ไป GitHub Actions และตั้งระบบเอกสาร

> **หมายเหตุ (2026-09-08):** ดีไซน์นี้ถูกแทนที่บางส่วนแล้ว — job `validate`,
> `preflight` และ `image` ถูกลบออก และ `.gitea/` ถูกลบทิ้ง ดู
> `docs/design/2026-09-08-simplify-ci-and-agent-bootstrap.md`


- **วันที่:** 2026-09-08
- **สถานะ:** implemented
- **Change record:** `docs/changes/2026-09-08-github-actions-and-docs.md`

## ปัญหา

repo ถูก push ขึ้น GitHub แล้ว แต่ CI ที่มีอยู่คือ `.gitea/workflows/ci.yaml`
ซึ่ง GitHub Actions ไม่อ่าน ทำให้ทุก push ไม่มีการตรวจอะไรเลย

นอกจากนี้ยังไม่มีที่เก็บเอกสาร และ `AGENTS.md` ไม่ได้กำหนดว่า agent
ต้องวางแผนก่อนลงมือ หรือต้องบันทึกสิ่งที่เปลี่ยน

## ขอบเขต

**อยู่ในขอบเขต:**
- แปลง Gitea CI เป็น GitHub Actions workflow
- สร้าง `docs/` พร้อมเทมเพลต
- เพิ่ม Workflow Rules + Documentation Rules ใน `AGENTS.md`

**ไม่อยู่ในขอบเขต:**
- ลบ `.gitea/workflows/ci.yaml` — ยังเก็บไว้เผื่อ mirror ไป Gitea
- เพิ่ม unit test / e2e เข้า CI — ยังไม่เคยรันบนเครื่อง CI จึงยังไม่กล้าใส่
- ตั้ง branch protection

## จุดที่พอร์ตตรง ๆ ไม่ได้

CI เดิมมี 2 จุดที่ผูกกับ Gitea/MiniIDP:

1. job `validate` poll commit status ผ่าน Gitea API เพื่อรอผลตรวจ `idp.yaml`
   จาก MiniIDP — บน GitHub ไม่มีใครยิง status นั้นเข้ามา job จะวนจนหมดเวลาเสมอ
2. job `build-push` `exit 1` ทันทีถ้าไม่มี `REGISTRY_*` secrets — repo GitHub
   ที่เพิ่งสร้างยังไม่มี secrets จะทำให้ CI แดงทุก push ตั้งแต่วันแรก

## ทางเลือกที่พิจารณา

| ทางเลือก | ข้อดี | ข้อเสีย |
| --- | --- | --- |
| A: คัดลอกไฟล์ตรง ๆ | ตรงกับของเดิม 100% | CI แดงตลอด ไม่มีประโยชน์จริง |
| B: ตัด validate + build-push ทิ้ง | เขียว, เรียบง่าย | เสีย Dockerfile validation และ deploy path เดิม |
| C: แทน validate ด้วยการ parse YAML, ทำ build-push ให้ push แบบมีเงื่อนไข | เขียวบน repo เปล่า, ยังคง behavior เดิมเมื่อใส่ secrets | ซับซ้อนกว่าเดิมเล็กน้อย (ต้องมี preflight job) |

## ทางที่เลือก

เลือก **C** เพราะรักษาเจตนาของ CI เดิมไว้ครบ (ตรวจ `idp.yaml`, build image,
push, แจ้ง MiniIDP, ล้าง tag เก่าบน Harbor) โดยไม่บังคับให้ต้องมี infra
ของ Gitea/Harbor ก่อนถึงจะรัน CI ได้

รายละเอียด:

- `validate` → checkout แล้ว parse `idp.yaml` ด้วย `yaml.safe_load`
  เก็บเจตนา "ตรวจ idp.yaml ก่อน" แต่ตัด dependency ต่อ Gitea API
- เพิ่ม job `preflight` ที่อ่าน secrets แล้วส่งออกเป็น output boolean
  (GitHub ไม่ให้อ้าง `secrets` ใน `if:` ระดับ job จึงต้องผ่าน job แยก)
- `build-push` → เปลี่ยนชื่อเป็น `image`: build เสมอ (Dockerfile ได้ถูกตรวจทุก push)
  แล้ว login/push/notify/retention เฉพาะเมื่อ `has_registry == 'true'`
  รวมเป็น build ครั้งเดียว ไม่ build ซ้ำ
- `quality` พอร์ตตรง แต่ใช้ `actions/setup-node` พร้อม `cache: pnpm`
  แทนการ cache pnpm store เองด้วย `actions/cache` — สั้นลงและได้ผลเท่ากัน
- เพิ่ม `permissions: contents: read` และ `concurrency` (cancel เฉพาะ PR)

## ไฟล์ที่แตะ

- `.github/workflows/ci.yml` (ใหม่)
- `docs/**` (ใหม่)
- `AGENTS.md`

## ความเสี่ยง / ผลกระทบ

- ผลต่อ schema: ไม่มี
- ผลต่อ API contract: ไม่มี
- ผลต่อ observability: ไม่มี
- แผนถอยกลับ: ลบ `.github/workflows/ci.yml` — `.gitea/workflows/ci.yaml` ยังอยู่ครบ

## แผนตรวจสอบ

- [x] `.github/workflows/ci.yml` parse เป็น YAML ได้
- [ ] `pnpm check` — ไม่จำเป็น ไม่ได้แตะโค้ดแอป
- [ ] `pnpm e2e` — ไม่จำเป็น
- [ ] `pnpm observability:test` — ไม่จำเป็น
- [ ] Docker build/run — ไม่จำเป็น ไม่ได้แก้ `Dockerfile`
