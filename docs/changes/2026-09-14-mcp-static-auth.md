# ป้องกัน MCP endpoint ด้วย static header token

- **วันที่:** 2026-09-14
- **Design doc:** `docs/design/2026-09-14-mcp-static-auth.md`
- **Commit / PR:** branch `feat/mcp-static-auth`

## เปลี่ยนอะไร

เพิ่มชั้นตรวจ static token หน้า `/api/mcp` เมื่อ env `MCP_AUTH_TOKEN` ถูกตั้ง ทุก request
ต้องส่ง token มาทาง `Authorization: Bearer <token>` หรือ `x-api-key: <token>` ไม่งั้นตอบ 401
ถ้าไม่ตั้ง token endpoint ยังเปิด (authless) เพื่อ dev/test

## ทำไม

`/api/mcp` เดิมเป็น authless — ใครได้ URL ไปก็ยิง KIE เปลือง credit ได้ ใช้ static header
(`static_headers` beta ของ claude.ai) กันได้จริงโดยไม่ต้องมี IdP ภายนอก

## ไฟล์ที่แตะ

| ไฟล์ | สิ่งที่ทำ |
| --- | --- |
| `src/server/env.ts` | เพิ่ม `MCP_AUTH_TOKEN` (optional) เข้า schema + mapping |
| `.env.example` | เพิ่ม `MCP_AUTH_TOKEN` พร้อมคำอธิบาย |
| `src/server/http/static-auth.ts` | ใหม่ — `withStaticAuth()` ตรวจ token (constant-time), 401 เมื่อผิด/ขาด |
| `src/app/api/mcp/route.ts` | wrap handler ด้วย `withStaticAuth` ก่อนส่งเข้า `observeRoute` |
| `tests/unit/mcp-static-auth.test.ts` | ใหม่ — 5 เทส guard |

## ต่างจากแผนตรงไหน

ตรงตามแผน

## ตรวจสอบแล้ว

- [x] `pnpm check` — lint + typecheck + test ผ่าน (24/24)
- [x] ทดสอบ local (curl) กับ dev server ที่ตั้ง token: ไม่มี token = 401, token ผิด = 401,
      token ถูกทาง `Authorization: Bearer` = 200, ทาง `x-api-key` = 200
- [ ] `pnpm observability:test` — ไม่จำเป็น (ไม่แตะ span chain)
- [ ] Docker build/run — ไม่แตะ

ผลลัพธ์ / สิ่งที่ยังค้าง:
- preview deployment ติด Vercel Deployment Protection จึง curl ทดสอบ auth ของเราบน preview
  ไม่ได้ (Vercel SSO บล็อกก่อนถึงโค้ด) — ตรวจจริงบน production หลัง merge
- ตั้ง `MCP_AUTH_TOKEN` บน Vercel production+preview แล้ว; production จะได้โค้ดใหม่หลัง merge

## ตามมาทีหลัง

- ยืนยันบน production: ไม่มี token = 401, มี token ถูก = สร้างรูปได้
- ผู้ใช้ต้องลบ connector authless เดิมใน claude.ai แล้วเพิ่มใหม่แบบใส่ header
  (`static_headers` beta) — `Authorization: Bearer <token>` หรือ `x-api-key: <token>`
- (ถ้าจะเข้ม) fail-closed เมื่อ `NODE_ENV=production` แต่ไม่ได้ตั้ง token, allowlist IP
  ของ Anthropic (`160.79.104.0/21`), หรือย้ายไป OAuth เต็มรูปแบบ
