# MCP server สำหรับสร้างภาพด้วย KIE.ai (GPT Image)

- **วันที่:** 2026-09-14
- **Design doc:** `docs/design/2026-09-14-kie-gpt-image-mcp.md`
- **Commit / PR:** PR #1 (branch `feat/kie-gpt-image-mcp`)

## เปลี่ยนอะไร

เพิ่ม remote MCP server ที่ `/api/mcp` (ผ่าน `mcp-handler`) เปิด 2 tools —
`generate_image` (text→image) และ `edit_image` (image→image จาก URL) — หนุนหลังด้วย
KIE.ai jobs API ให้ claude.ai ต่อเป็น custom connector แล้วสั่งสร้าง/แก้รูปได้ โดย key
อยู่ฝั่ง server เท่านั้น

## ทำไม

repo นี้ตั้งใจเป็นที่อยู่ของ agents/MCP แต่ยังว่าง งานแรกคือ MCP สร้างภาพ GPT Image
ที่ใช้จากแชทธรรมดาของ claude.ai ได้ โดยไม่เอา API key ไปไว้ฝั่ง client

## ไฟล์ที่แตะ

| ไฟล์ | สิ่งที่ทำ |
| --- | --- |
| `package.json`, `pnpm-lock.yaml` | เพิ่ม `mcp-handler` + peer `@modelcontextprotocol/server` |
| `src/server/env.ts` | เพิ่ม `KIE_API_KEY` (optional) เข้า schema + mapping |
| `.env.example` | เพิ่ม `KIE_API_KEY` พร้อมคำอธิบาย |
| `src/server/kie/client.ts` | ใหม่ — KIE client (createTask/poll) หุ้ม `withSpan` |
| `src/features/image-generation/contracts.ts` | ใหม่ — zod schema ของ 2 tool inputs |
| `src/features/image-generation/service.ts` | ใหม่ — `generateImage`/`editImage` หุ้ม `withSpan`, inject client ได้ |
| `src/app/api/mcp/route.ts` | ใหม่ — MCP handler ลงทะเบียน 2 tools, wrap `observeRoute`, `runtime=nodejs`, `maxDuration=300` |
| `tests/unit/image-generation-schema.test.ts` | ใหม่ — 6 เทส contracts |
| `tests/unit/image-generation-service.test.ts` | ใหม่ — 3 เทส service (stub client) |

## ต่างจากแผนตรงไหน

ตรงตามแผนเป็นส่วนใหญ่ จุดที่เบี่ยงอย่างตั้งใจ:

- **ไม่มี `repository.ts`** — งานนี้ไม่มี DB จึงข้ามชั้น repository ของ `add-feature` skill
  (ซึ่งเป็น DB-centric) และให้ KIE client ใน `src/server/kie/` ทำหน้าที่ gateway แทน
  โดยยังรักษา span chain: `observeRoute` → `withSpan` (service) → `withSpan` (kie client)
- **File upload API ของ KIE ไม่ได้ใช้** — `edit_image` รับเป็น URL สาธารณะตรง ๆ (แชทมี URL
  อยู่แล้ว) จึงไม่ต้องอัปโหลดไฟล์ในเวอร์ชันนี้

## ตรวจสอบแล้ว

- [x] `pnpm check` — lint (max-warnings=0) + typecheck + test ผ่านหมด, เทส 19/19
- [ ] `pnpm e2e` — ไม่ได้รันเต็ม; ทดสอบ MCP ด้วย handshake จริงแทน (ดูด้านล่าง)
- [ ] `pnpm observability:test` — ยังไม่รัน (ต้องใช้ Docker Tempo/Grafana)
- [ ] Docker build/run — ไม่แตะ

ผลลัพธ์ / สิ่งที่ยังค้าง:
- รัน `next dev` แล้วยิง MCP handshake ผ่าน curl: `initialize` คืน serverInfo ถูก,
  `tools/list` เห็นครบ 2 tools พร้อม JSON schema, และ `tools/call generate_image`
  ยิง KIE จริงได้รูปกลับ (~77s, ต่ำกว่าลิมิต 300s)
- deploy ขึ้น Vercel production แล้ว: `https://heenzaa-agents-mcp.vercel.app/api/mcp`
  (ตั้ง `KIE_API_KEY` เป็น env production+preview) เข้าถึงได้ ไม่มี auth wall
- ทดสอบ `tools/call generate_image` บน production จริง ได้รูปกลับ (~90s < 300s →
  Fluid compute ทำงาน)

## ตามมาทีหลัง

- ต่อเข้า claude.ai (Customize → Connectors → Add custom connector →
  `https://heenzaa-agents-mcp.vercel.app/api/mcp`) — เป็น action ฝั่งผู้ใช้
- **Auth:** v1 ยังไม่มี — พึ่ง URL ลับ; เสริม OAuth (`withMcpAuth`) ทีหลัง
- แนบรูป inline (base64) ในผลลัพธ์ tool เพื่อให้โชว์ในแชทเลย
- `pnpm e2e` / `pnpm observability:test` สำหรับ route ใหม่ถ้าต้องการครอบคลุมเต็ม
