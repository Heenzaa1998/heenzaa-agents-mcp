# ย้ายฐานข้อมูลของ template จาก SQLite/libSQL ไป Postgres (Neon)

- **วันที่:** 2026-09-24
- **Design doc:** `docs/design/2026-09-24-postgres-neon.md`
- **Commit / PR:** branch `feat/postgres-neon`

## เปลี่ยนอะไร

ฐานข้อมูลเปลี่ยนจาก SQLite แบบไฟล์เป็น Neon Postgres ผ่าน driver แบบ HTTP ของ Neon
(`drizzle-orm/neon-http`) migration สร้างใหม่สำหรับ Postgres และ apply ลง Neon แล้ว
Dockerfile ไม่เก็บฐานข้อมูลใน container อีก

## ทำไม

SQLite แบบไฟล์ใช้บน Vercel ไม่ได้ (route subscribers บน production พังอยู่) และงานถัดไป
ต้องมีฐานข้อมูลถาวร ผู้ใช้สร้าง Neon ผ่าน Vercel integration ไว้แล้ว

## ไฟล์ที่แตะ

| ไฟล์ | สิ่งที่ทำ |
| --- | --- |
| `package.json`, `pnpm-lock.yaml` | ลบ `@libsql/client`, เพิ่ม `@neondatabase/serverless` |
| `src/server/env.ts` | `DATABASE_URL` รับ `postgres(ql)://` + placeholder default, เพิ่ม `DATABASE_URL_UNPOOLED`, ลบ `DATABASE_AUTH_TOKEN` |
| `src/server/db/client.ts`, `schema.ts`, `drizzle.config.ts` | driver Neon HTTP, `pgTable`, dialect `postgresql`, migration ใช้ URL แบบ unpooled |
| `drizzle/*` | ลบ migration SQLite, generate `0000_past_vulcan.sql` สำหรับ Postgres |
| `src/server/observability/tracing.ts` | `db.system.name` → `postgresql` |
| `src/features/subscribers/service.ts` | ดัก unique violation ด้วยรหัส `23505` (ไล่ดูใน `cause` ด้วย) |
| `tests/unit/subscriber-service.test.ts` | เพิ่มเทสเคสแข่งกัน insert (race) ที่ได้ `23505` |
| `Dockerfile` | ลบ default `DATABASE_URL` แบบไฟล์ และ volume `/app/data` |
| `.env.example`, `README.md`, `AGENTS.md`, `idp.yaml`, `src/content/site.ts` | เอกสารและข้อความให้ตรงกับ Neon |

## ต่างจากแผนตรงไหน

- **ไม่ได้แก้ `.gitignore`** — คงบรรทัด ignore `local.db` ไว้ เพราะเครื่องที่เคยรันแบบ SQLite
  ยังมีไฟล์นี้ค้าง ถ้าเลิก ignore มันจะโผล่ใน git
- **`/api/health` คงรูปแบบ response เดิม** ช่อง `database` ยังเป็น `file | remote` และตอนนี้เป็น
  `remote` เสมอ ไม่เปลี่ยน contract เพื่อไม่ให้ e2e และผู้ที่ probe อยู่พัง
- `createdAt` ยังเป็น string แต่รูปแบบเปลี่ยนเป็นแบบ Postgres เช่น `2026-09-24 02:54:37.639207+00`

## ตรวจสอบแล้ว

- [x] `pnpm check` — lint + typecheck + test ผ่าน (60/60)
- [ ] `pnpm e2e` — ไม่รัน เพราะจะเขียนแถวทดสอบลง DB ที่ใช้ร่วมกับ production; ทดสอบด้วย curl แทน
- [ ] `pnpm observability:test` — ไม่รัน (เปลี่ยนแค่ attribute)
- [x] Docker build/run — build `runner` และ `migrator` ผ่าน (runner build โดยไม่มี `.env` ได้);
      migrator รันกับ Neon exit 0; runner สตาร์ทแล้ว `/api/health` ตอบ 200

ผลลัพธ์ / สิ่งที่ยังค้าง:
- `pnpm db:migrate` ลง Neon สำเร็จ
- dev server + Neon: `POST /api/subscribers` ได้ 201, อีเมลซ้ำ 409, ข้อมูลผิด 400, MCP ยังทำงาน;
  ลบแถวทดสอบออกแล้ว (ตารางว่าง)
- ยืนยันบน production หลัง merge

## ตามมาทีหลัง

- แยก Neon branch ให้ dev/preview เพื่อไม่ให้การทดสอบแตะข้อมูล production
- ตาราง `generations` + tool ประวัติงาน (PR ถัดไป)
- env ของ Neon Auth (`NEON_AUTH_BASE_URL`) ถูกตั้งมาด้วย อาจใช้ทำ login ของหน้า UI
