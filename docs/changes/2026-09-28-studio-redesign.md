# เปลี่ยนเว็บจาก template เป็น product "Heenzaa Studio" ธีม dark studio

- **วันที่:** 2026-09-28
- **Design doc:** `docs/design/2026-09-28-studio-redesign.md`
- **Commit / PR:** PR #7 (branch `feat/gallery`, รวมกับงาน gallery)

## เปลี่ยนอะไร

ออกแบบเว็บใหม่ทั้งหมดเป็น "Heenzaa Studio": ธีมมืดสีเน้นเดียว (lime), ฟอนต์ Space Grotesk /
Inter / JetBrains Mono, header/footer ใหม่, หน้าแรกอธิบาย studio + tools + วิธีต่อ claude.ai,
ทำ gallery และหน้า login ใหม่ในธีมเดียวกัน ลบหน้า `/guide`, `/operations` และ component
ของ template ออก

## ทำไม

ผู้ใช้หยุด merge gallery ที่ทำตามหน้าตา template และต้องการเว็บที่เป็น product ของตัวเอง
ธีม dark studio (ผู้ใช้เลือก) ให้รูปและวิดีโอเป็นพระเอก

## ไฟล์ที่แตะ

| ไฟล์ | สิ่งที่ทำ |
| --- | --- |
| `src/app/globals.css` | token สีใหม่ทั้งหมด, สีสถานะ, ฟอนต์, ย้าย base style เข้า `@layer base` |
| `src/app/layout.tsx` | ฟอนต์ผ่าน `next/font/google`, metadata ชื่อ product |
| `src/content/site.ts` | เนื้อหา product แทน template (brand, tools, pipeline, connect) |
| `src/app/page.tsx` | หน้าแรกใหม่ |
| `src/app/gallery/page.tsx`, `login/page.tsx`, `src/components/gallery-login-form.tsx` | ออกแบบใหม่ |
| `src/components/site-header.tsx`, `site-footer.tsx` | ใหม่ทั้งหมด |
| `src/components/copy-button.tsx`, `endpoint-url.tsx` | ใหม่ |
| `src/components/ui/*` | ปรับ primitive ให้เข้าธีม |
| ลบ `src/app/guide`, `src/app/operations`, `page-hero`, `section-card`, `page-shell`, `subscribe-form`, `tests/unit/site-pages.test.tsx` | ของ template |
| `tests/unit/home-page.test.tsx`, `tests/e2e/home.spec.ts` | เทสตามหน้าใหม่ |
| `AGENTS.md` | UI Rules, Working Defaults, Project Shape, Tests ให้ตรงกับของใหม่ |

## ต่างจากแผนตรงไหน

- **เจอสาเหตุบั๊กเมนู active ของ template:** `a { color: inherit }` ใน `globals.css` ไม่ได้อยู่ใน
  cascade layer จึงชนะ utility ของ Tailwind v4 ทุกตัว ทำให้ปุ่มลิงก์สีเขียวมีตัวหนังสือกลืนพื้น
  แก้โดยย้าย base style ทั้งหมดเข้า `@layer base` และเขียนกฎไว้ใน `AGENTS.md`
- เพิ่ม `endpoint-url.tsx` (ไม่ได้อยู่ในแผน) ให้หน้าแรกแสดง URL ของ MCP บนโดเมนจริงพร้อมปุ่มก๊อป
- รูปใน gallery ใช้ไฟล์ต้นฉบับขนาด 2–6 MB ต่อรูป โหลดช้าบนมือถือ ใส่พื้นสีระหว่างโหลดไว้ก่อน

## ตรวจสอบแล้ว

- [x] `pnpm check` — lint + typecheck + test ผ่าน (95/95)
- [ ] `pnpm e2e` — อัปเดตเทสแล้ว แต่ไม่รันชุดเต็ม (DB ร่วมกับ production)
- [ ] `pnpm observability:test` — ไม่แตะ
- [x] Docker build `runner` ผ่าน (โหลดฟอนต์ตอน build ได้)

ผลลัพธ์ / สิ่งที่ยังค้าง:
- ถ่ายภาพทุกหน้าด้วย Chromium ทั้ง desktop (1440) และมือถือ (390): หน้าแรก, login, gallery,
  filter วิดีโอ, ผลค้นหาว่าง ไม่มี error ใน console และไม่มี request ล้ม; รูปโหลดครบ 4/4

## ตามมาทีหลัง

- ทำ thumbnail ขนาดเล็กตอนเก็บไฟล์ลง R2 ให้ gallery โหลดเร็วขึ้น
- ลบ feature subscribers ที่เหลืออยู่ (ตอนนี้เหลือแค่ API ไม่มีหน้าเว็บใช้)
