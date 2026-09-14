# ป้องกัน MCP endpoint ด้วย static header token

- **วันที่:** 2026-09-14
- **สถานะ:** approved
- **Change record:** `docs/changes/2026-09-14-mcp-static-auth.md` (เติมเมื่อทำเสร็จ)

## ปัญหา

`/api/mcp` ตอนนี้เป็น authless — ใครได้ URL ไปก็เรียก `generate_image`/`edit_image`
ยิง KIE เปลือง credit ของเราได้ ต้องมีชั้นกันคนแปลกหน้า

## ขอบเขต

**อยู่ในขอบเขต:**
- ตรวจ static token ที่ claude.ai ส่งมาเป็น request header (`static_headers` beta)
- รับ token จาก `Authorization: Bearer <token>` หรือ `x-api-key: <token>` (สอง header
  มาตรฐานที่ claude.ai อนุญาตโดยไม่ต้องให้ Anthropic รีวิว)
- env `MCP_AUTH_TOKEN` (optional) + guard wrapper รอบ MCP handler
- เทียบแบบ constant-time; ตอบ 401 เมื่อไม่มี/ผิด
- unit test ของ guard + ตั้ง token บน Vercel + redeploy

**ไม่อยู่ในขอบเขต:**
- OAuth (DCR/CIMD/managed IdP) — เลือกไม่ทำในรอบนี้
- token ต่อผู้ใช้ / การหมุน token อัตโนมัติ / UI จัดการ token
- allowlist IP ของ Anthropic (`160.79.104.0/21`) — อาจเสริมทีหลัง

## ทางเลือกที่พิจารณา

| ทางเลือก | ข้อดี | ข้อเสีย |
| --- | --- | --- |
| A: static header token | ง่าย ไม่ต้องมี IdP ภายนอก กัน credit ได้จริง | เป็น shared secret ระดับ org, เป็นฟีเจอร์ beta ของ claude.ai |
| B: OAuth ผ่าน managed IdP | มาตรฐาน รองรับหลาย user/device | ต้องสมัคร/ตั้งค่า IdP ภายนอก + login flow |
| C: self-host AS เอง | ไม่พึ่งของนอก | ซับซ้อน + เสี่ยง security bug |

## ทางที่เลือก

**A** — ตรงกับเป้าหมาย (กันคนอื่นมายิงเปลือง credit) โดยงานน้อยและไม่พึ่งบริการนอก
key ยังอยู่ฝั่ง server เหมือนเดิม เพิ่มแค่ชั้นตรวจ token หน้า handler

## แผนการทำ

1. เพิ่ม `MCP_AUTH_TOKEN` (optional) ใน `src/server/env.ts` + `.env.example`
2. `src/server/http/static-auth.ts` — `withStaticAuth(handler, token = env.MCP_AUTH_TOKEN)`:
   ถ้า token ไม่ตั้ง → ปล่อยผ่าน (authless, เพื่อ dev/test); ถ้าตั้ง → ดึง token จาก header,
   เทียบ constant-time, ผิด/ขาด → 401 JSON
3. `src/app/api/mcp/route.ts` — wrap เป็น `observeRoute(opts, withStaticAuth(mcpHandler))`
   เพื่อให้ 401 ถูกนับใน metrics/log ด้วย
4. `tests/unit/mcp-static-auth.test.ts` — เทส: ไม่ตั้ง token = ผ่าน, ตั้งแล้วขาด/ผิด = 401,
   ถูก = delegate ไป handler
5. `pnpm check` + ทดสอบ local ด้วย curl (มี/ไม่มี token)
6. ตั้ง `MCP_AUTH_TOKEN` (สุ่มแข็งแรง) บน Vercel production+preview → redeploy
7. ทดสอบ production: ไม่มี token = 401, มี token = ผ่าน

## ไฟล์ที่คาดว่าจะแตะ

- `src/server/env.ts`, `.env.example`
- `src/server/http/static-auth.ts` (ใหม่)
- `src/app/api/mcp/route.ts`
- `tests/unit/mcp-static-auth.test.ts` (ใหม่)
- `docs/changes/2026-09-14-mcp-static-auth.md` (ใหม่)

## ความเสี่ยง / ผลกระทบ

- **ผลต่อ schema:** ไม่มี
- **ผลต่อ API contract:** `/api/mcp` เปลี่ยนจาก authless เป็นต้องมี token (เมื่อ env ตั้ง) →
  connector authless เดิมที่เพิ่มไว้ใน claude.ai จะใช้ไม่ได้ ต้องลบแล้วเพิ่มใหม่แบบใส่ header
- **ผลต่อ observability:** เพิ่มการนับ 401 ผ่าน `observeRoute` ตามปกติ
- **fail-open:** ถ้า `MCP_AUTH_TOKEN` ไม่ถูกตั้งใน production endpoint จะเปิด — ต้องมั่นใจว่าตั้งแล้ว
- **beta:** `static_headers` เป็น beta ของ claude.ai และ admin เป็นคนใส่ header ตอนเพิ่ม connector
- **แผนถอยกลับ:** ลบ env `MCP_AUTH_TOKEN` (กลับเป็น authless) หรือ revert commit

## แผนตรวจสอบ

- [ ] `pnpm check`
- [ ] `pnpm e2e` (ถ้าแตะ route/page/flow) — ทดสอบด้วย curl มี/ไม่มี token แทน
- [ ] `pnpm observability:test` — ไม่จำเป็น (ไม่เปลี่ยน tracing chain)
- [ ] Docker build/run — ไม่แตะ
- [ ] ทดสอบ production: 401 เมื่อไม่มี token, สร้างรูปได้เมื่อมี token ถูก
