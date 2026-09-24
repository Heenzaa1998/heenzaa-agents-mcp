# ย้ายฐานข้อมูลของ template จาก SQLite/libSQL ไป Postgres (Neon)

- **วันที่:** 2026-09-24
- **สถานะ:** approved
- **Change record:** `docs/changes/2026-09-24-postgres-neon.md` (เติมเมื่อทำเสร็จ)

## ปัญหา

template ใช้ SQLite แบบไฟล์ (`file:local.db`) ซึ่งใช้บน Vercel ไม่ได้เพราะ serverless เขียนไฟล์ถาวร
ไม่ได้ ตอนนี้ route subscribers บน production จึงพังอยู่แล้ว และงานถัดไป (เก็บประวัติรูป/วิดีโอ
และหน้า gallery) ต้องมีฐานข้อมูลถาวร ผู้ใช้สร้าง Neon Postgres ผ่าน Vercel integration แล้ว
(env `DATABASE_URL` / `DATABASE_URL_UNPOOLED` ถูกตั้งให้ทุก environment)

## ขอบเขต

**อยู่ในขอบเขต:**
- Drizzle dialect `sqlite` → `postgresql`, schema `subscribers` เป็น `pgTable`
- driver `@libsql/client` → `@neondatabase/serverless` (HTTP) ผ่าน `drizzle-orm/neon-http`
- env: `DATABASE_URL` รับ `postgres(ql)://`, เพิ่ม `DATABASE_URL_UNPOOLED` (ใช้กับ migration),
  ลบ `DATABASE_AUTH_TOKEN`
- migration: ลบของ SQLite แล้ว generate ใหม่สำหรับ Postgres และ apply ลง Neon
- tracing `db.system.name` → `postgresql`, ตัวดัก unique violation ใช้รหัส Postgres `23505`
- Dockerfile: เอา default ไฟล์ SQLite และ volume `/app/data` ออก ให้ส่ง `DATABASE_URL` ตอนรัน
- เอกสาร: `AGENTS.md` (Database/Docker Rules), README, `idp.yaml`, `.env.example`, ข้อความหน้าเว็บใน `src/content/site.ts`

**ไม่อยู่ในขอบเขต:**
- ตาราง `generations` และ tool ประวัติงาน (PR ถัดไป)
- หน้า UI
- แยก Neon branch สำหรับ dev/preview

## ทางเลือกที่พิจารณา

| ทางเลือก | ข้อดี | ข้อเสีย |
| --- | --- | --- |
| A: Turso (คง libSQL) | แทบไม่ต้องแก้โค้ด | ผู้ใช้ต้องสมัครบริการเพิ่ม ทั้งที่มี Neon แล้ว |
| B: Neon + `@neondatabase/serverless` (HTTP) | ไม่มี connection pool ให้จัดการบน serverless, Neon แนะนำสำหรับ Vercel | ใช้ได้กับ Neon เท่านั้น ต่อ Postgres ทั่วไป (เช่นใน Docker ในเครื่อง) ไม่ได้ |
| C: Neon + `postgres` (postgres.js, TCP) | ใช้กับ Postgres ตัวไหนก็ได้ | ต้องจัดการ connection บน serverless (pooler, `prepare: false`, idle connection) |

## ทางที่เลือก

**B** — ผู้ใช้ deploy บน Vercel และใช้ Neon อยู่แล้ว driver แบบ HTTP ไม่ต้องดูแล connection
เลยเข้ากับกฎ repo ที่ให้เลือกทางตรงไปตรงมา ข้อเสียเรื่องใช้กับ Postgres อื่นไม่ได้ยอมรับได้
เพราะ template ถูกปรับมาใช้กับ Neon โดยเฉพาะแล้ว ถ้าวันหน้าต้องใช้ Postgres อื่นค่อยเปลี่ยน driver
ที่ `src/server/db/client.ts` จุดเดียว

- `createdAt` ใช้ `timestamp(... { mode: "string", withTimezone: true })` ให้ `SubscriberRecord`
  ยังเป็น string เหมือนเดิม โค้ดและเทสที่อ่านค่านี้ไม่ต้องเปลี่ยน
- migration ใช้ `DATABASE_URL_UNPOOLED` (ต่อตรงไม่ผ่าน pooler ตามที่ Neon แนะนำสำหรับ DDL)
  ถ้าไม่มีค่อยใช้ `DATABASE_URL`
- default ของ `DATABASE_URL` เป็น URL placeholder ของ Postgres ในเครื่อง เพื่อให้ build/unit test/CI
  ที่ไม่มี DB ยังผ่าน (driver HTTP ไม่ต่อจริงตอน import)

## แผนการทำ

1. `pnpm remove @libsql/client` และ `pnpm add @neondatabase/serverless`
2. แก้ `env.ts`, `db/client.ts`, `db/schema.ts`, `drizzle.config.ts`, `tracing.ts`, `subscribers/service.ts`
3. ลบ `drizzle/` เดิม แล้ว `pnpm db:generate` ได้ migration ของ Postgres
4. `pnpm db:migrate` ลง Neon
5. Dockerfile + เอกสารทั้งหมด
6. เทสเพิ่ม: unique violation ของ Postgres (`23505`) → `subscriber_exists`
7. `pnpm check`, `pnpm build`, ทดสอบ `/api/subscribers` จริงกับ Neon, Docker build (ถ้าเครื่องมี Docker)
8. PR → merge → ยืนยัน production ทั้ง subscribers และ MCP

## ไฟล์ที่คาดว่าจะแตะ

- `package.json`, `pnpm-lock.yaml`
- `src/server/env.ts`, `src/server/db/client.ts`, `src/server/db/schema.ts`, `drizzle.config.ts`
- `src/server/observability/tracing.ts`, `src/features/subscribers/service.ts`
- `drizzle/*` (ลบและสร้างใหม่)
- `Dockerfile`, `.env.example`, `.gitignore`
- `AGENTS.md`, `README.md`, `idp.yaml`, `src/content/site.ts`
- `tests/unit/subscriber-service.test.ts`
- `docs/changes/2026-09-24-postgres-neon.md` (ใหม่)

## ความเสี่ยง / ผลกระทบ

- **ผลต่อ schema:** ตาราง `subscribers` สร้างใหม่บน Postgres; ไม่มีข้อมูลเก่าต้องย้าย
  (SQLite เดิมอยู่แค่ในเครื่องและบน Vercel ใช้ไม่ได้อยู่แล้ว)
- **ผลต่อ API contract:** ไม่เปลี่ยน รูปร่าง response ของ `/api/subscribers` เหมือนเดิม
- **ผลต่อ observability:** `db.system.name` เปลี่ยนเป็น `postgresql` ชื่อ span/metric เดิม
- **Runtime:** dev ในเครื่องต้องต่อ Neon ไม่มีไฟล์ DB ในเครื่องอีก
- **ทุก environment ใช้ DB ตัวเดียวกัน:** Vercel integration ตั้งให้ dev/preview/production ชี้ branch หลัก
  ตัวเดียวกัน การทดสอบจากเครื่องจึงเขียนลงข้อมูล production ควรแยก Neon branch ทีหลัง
- **ช่วงก่อน merge:** env บน Vercel เป็น Postgres แล้ว ถ้า redeploy `main` เดิมแอปจะล้มที่ env
  validation ห้าม redeploy จนกว่า PR นี้ merge
- **แผนถอยกลับ:** revert commit และตั้ง `DATABASE_URL` กลับเป็นค่า libSQL

## แผนตรวจสอบ

- [ ] `pnpm check`
- [ ] `pnpm e2e` — ไม่รันเต็ม (จะเขียนแถวทดสอบลง DB production) ทดสอบ `/api/subscribers` ด้วย curl แทน
- [ ] `pnpm observability:test` — ไม่รัน (ต้องใช้ Docker) เปลี่ยนแค่ attribute
- [ ] Docker build/run — build runner/migrator ถ้าเครื่องมี Docker
- [ ] production: สมัคร subscriber ได้ และ MCP ยังทำงาน
