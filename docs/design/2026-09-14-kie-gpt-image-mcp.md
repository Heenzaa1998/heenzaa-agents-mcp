# MCP server สำหรับสร้างภาพด้วย KIE.ai (GPT Image)

- **วันที่:** 2026-09-14
- **สถานะ:** implemented
- **Change record:** `docs/changes/2026-09-14-kie-gpt-image-mcp.md` (เติมเมื่อทำเสร็จ)

## ปัญหา

repo นี้ (`heenzaa-agents-mcp`) ตั้งใจให้เป็นที่อยู่ของ "agents/MCP" แต่ตอนนี้ยังเป็น
Next.js starter เปล่า ๆ ที่มีแค่ตัวอย่าง subscribers งานแรกที่ต้องการคือ **remote MCP
server** ที่เปิด tool สร้าง/แก้ภาพด้วย OpenAI GPT Image (ผ่านผู้ให้บริการ KIE.ai) ให้
claude.ai (แชทธรรมดา) ต่อเป็น custom connector แล้วสั่งสร้างรูปได้ โดย API key ต้องอยู่
ฝั่ง server เท่านั้น

## ขอบเขต

**อยู่ในขอบเขต:**
- route `POST/GET /api/mcp` ด้วย `mcp-handler` (Streamable HTTP, ไม่ต้องใช้ Redis)
- feature `image-generation` — contracts + service (ไม่มี DB)
- KIE client เป็น infra ใน `src/server/kie/`
- 2 tools: `generate_image` (text→image), `edit_image` (image→image จาก URL)
- เพิ่ม `KIE_API_KEY` เข้า env schema (แบบ optional) + `.env.example`
- unit tests: contracts + service (stub KIE client)
- deploy ขึ้น Vercel + วิธีต่อเข้า claude.ai

**ไม่อยู่ในขอบเขต (ทำทีหลัง):**
- OAuth/`withMcpAuth` — v1 พึ่ง URL ลับก่อน
- แนบรูป inline แบบ base64 (ถ้า payload ใหญ่เกิน) — เริ่มจากคืน URL เป็นหลัก
- แก้หน้า public (`/`, `/guide`, `/operations`) ให้เล่าเรื่อง MCP
- ตัด/ย้ายตัวอย่าง subscribers + DB ออก (คงไว้ก่อน ไม่ให้ของเดิมพัง)

## ทางเลือกที่พิจารณา

| ทางเลือก | ข้อดี | ข้อเสีย |
| --- | --- | --- |
| A: `mcp-handler` (adapter ทางการ Vercel) | ไฟล์เดียว, รองรับ Streamable HTTP + spec ล่าสุด, ไม่ต้อง Redis, deploy Vercel ลื่น | เพิ่ม dependency ใหม่ |
| B: ใช้ `@modelcontextprotocol/sdk` ดิบ ต่อ transport เอง | คุมทุกอย่างเอง | โค้ด boilerplate เยอะ ต้องจัดการ session/HTTP เอง |
| C: feature มี repository ตามสกิล add-feature | ตรงแพตเทิร์นเดิมเป๊ะ | ผิดฝาผิดตัว — งานนี้ไม่มี DB, repository = DB access |

## ทางที่เลือก

- **A** สำหรับ transport: `mcp-handler` ตัดงาน HTTP/session ทิ้งไปได้เยอะ และเป็นเส้นทางที่ Vercel รองรับตรง ๆ
- เรื่องโครง feature: ทำ **service อย่างเดียว ไม่มี repository** เพราะงานนี้ไม่มีฐานข้อมูล
  ตัว `add-feature` skill เป็น DB-centric (repository = DB access + `withDatabaseSpan`)
  ซึ่งไม่ตรงกับงานที่เรียก external API — จึงเบี่ยงอย่างตั้งใจ โดยยังรักษาเจตนาเดิมของกฎ
  observability ไว้: **span chain = route (`observeRoute`) → service (`withSpan`) → KIE client (`withSpan` รอบ HTTP call)**
- KIE client วางใน `src/server/kie/` ตามกฎ "infra อยู่ src/server"
- key: `KIE_API_KEY` ผ่าน env schema แต่เป็น **optional** เพื่อไม่ให้ build/test/CI ที่ไม่มี key พัง;
  ถ้าไม่มี key ตอนเรียก tool ให้ client โยน `AppError` ที่อ่านรู้เรื่อง (ไม่ bypass env validation)

## แผนการทำ

1. `pnpm add mcp-handler` (+ MCP SDK ตามที่ adapter ต้องการ) แล้วยืนยันว่าเข้ากับ Next 16 / React 19 / zod 4
2. เพิ่ม `KIE_API_KEY` (optional) ใน `src/server/env.ts` + `.env.example`
3. `src/server/kie/client.ts` — createTask / pollTask / uploadImage หุ้มด้วย `withSpan`, ใส่ browser UA (เลี่ยง Cloudflare 1010 ของ host อัปโหลด), อ่าน key ตอน call
4. `src/features/image-generation/contracts.ts` — zod schema ของ 2 tool inputs + inferred types
5. `src/features/image-generation/service.ts` — `generateImage` / `editImage` หุ้ม `withSpan`, parse ด้วย contracts, รับ client แบบ inject ได้ (ค่า default = client จริง) เพื่อให้เทสได้โดยไม่ต้องยิงเน็ต
6. `src/app/api/mcp/route.ts` — `createMcpHandler` ลงทะเบียน 2 tools ที่เรียก service, `export const runtime = "nodejs"`, `export const maxDuration = 300`, หุ้มด้วย `observeRoute` ต่อ method (GET/POST)
7. tests: `tests/unit/image-generation-schema.test.ts`, `tests/unit/image-generation-service.test.ts`
8. `pnpm check` ให้ผ่าน + ทดสอบ MCP ด้วย inspector/curl ในเครื่อง
9. deploy Vercel (ตั้ง `KIE_API_KEY` เป็น env) → ได้ URL `/api/mcp` → ต่อ claude.ai
10. เขียน change record + commit คู่กับโค้ด

## ไฟล์ที่คาดว่าจะแตะ

- `package.json`, `pnpm-lock.yaml` (เพิ่ม dependency)
- `src/server/env.ts`, `.env.example` (เพิ่ม `KIE_API_KEY`)
- `src/server/kie/client.ts` (ใหม่)
- `src/features/image-generation/contracts.ts`, `service.ts` (ใหม่)
- `src/app/api/mcp/route.ts` (ใหม่)
- `tests/unit/image-generation-schema.test.ts`, `tests/unit/image-generation-service.test.ts` (ใหม่)
- `docs/changes/2026-09-14-kie-gpt-image-mcp.md` (ใหม่)

## ความเสี่ยง / ผลกระทบ

- **ผลต่อ schema:** ไม่มี — ไม่แตะ DB/ตาราง/migration
- **ผลต่อ API contract:** เพิ่ม route ใหม่ `/api/mcp` เท่านั้น ของเดิมไม่เปลี่ยน
- **ผลต่อ observability:** เพิ่ม span ใหม่สาย `image-generation.*` + `kie.*`; ใช้ attribute แบบ low-cardinality (ไม่ใส่ prompt/URL เป็น metric), `/api/mcp` เป็น route label คงที่
- **Vercel:** serverless เขียนไฟล์ไม่ได้ → route subscribers ที่ใช้ SQLite ไฟล์จะใช้ไม่ได้บน Vercel (นอกขอบเขต ยอมรับได้); MCP route ไม่พึ่ง DB จึงไม่กระทบ
- **ความปลอดภัย:** v1 ไม่มี auth — URL ต้องเก็บเป็นความลับ (ถ้าหลุด = คนอื่นยิงเปลือง credit); เสริม OAuth ทีหลัง
- **แผนถอยกลับ:** ทุกอย่างเป็นไฟล์ใหม่ + route ใหม่ ลบโฟลเดอร์/route ที่เพิ่มก็กลับสู่สภาพเดิม; ยัง revert commit ได้ตรง ๆ

## แผนตรวจสอบ

- [ ] `pnpm check`
- [ ] `pnpm e2e` (ถ้าแตะ route/page/flow) — เพิ่ม route ใหม่ แต่ทดสอบ MCP ด้วย inspector/curl แทน e2e เต็ม
- [ ] `pnpm observability:test` (ถ้าแตะ tracing/metrics/logging) — เพิ่ม span ใหม่ ควรรัน
- [ ] Docker build/run (ถ้าแตะ Dockerfile/runtime) — ไม่แตะ
- [ ] ทดสอบ tool จริงผ่าน MCP inspector: `list tools` + เรียก `generate_image` ได้รูปกลับ
