# เปลี่ยนเว็บจาก template เป็น product "Heenzaa Studio" ธีม dark studio

- **วันที่:** 2026-09-28
- **สถานะ:** approved
- **Change record:** `docs/changes/2026-09-28-studio-redesign.md` (เติมเมื่อทำเสร็จ)

## ปัญหา

หน้าเว็บยังเป็นของ starter template (สีครีม/น้ำตาล, หน้า Overview/Guide/Operations ที่อธิบาย
template, ฟอร์ม subscriber ตัวอย่าง) ไม่ได้สื่อว่านี่คือเครื่องมือสร้างรูป/วิดีโอผ่าน Claude
ผู้ใช้หยุด merge หน้า gallery ที่ทำตามหน้าตาเดิม และขอให้ออกแบบใหม่ทั้งเว็บเป็น product ของตัวเอง
ด้วยธีม dark studio (เลือกเองจากตัวเลือก)

## ขอบเขต

**อยู่ในขอบเขต:**
- design system ใหม่: สี (dark + สีเน้นเดียว), ฟอนต์, radius, ปุ่ม/การ์ด/input/badge
- header/footer ใหม่, ชื่อ product "Heenzaa Studio" (เก็บไว้ที่เดียวใน `src/content/site.ts`)
- หน้าแรก `/` ใหม่: อธิบาย studio, tools ทั้ง 6, pipeline, วิธีต่อ claude.ai (ไม่มีข้อมูลส่วนตัว)
- ออกแบบ `/gallery` และ `/gallery/login` ใหม่ในธีมเดียวกัน (filter แบบปุ่ม, ปุ่มก๊อป key)
- ลบหน้า `/guide`, `/operations` และ component ที่ใช้แค่ในหน้า template (ข้อมูลเดิมอยู่ใน README/AGENTS.md แล้ว)
- ลบฟอร์ม subscriber ออกจากหน้าแรก (API `/api/subscribers` ยังอยู่และทำงาน)
- อัปเดตเทส และ `AGENTS.md` หมวดที่ขัดกับการเปลี่ยนแปลง (UI Rules, Tests, Working Defaults)

**ไม่อยู่ในขอบเขต:**
- สร้างรูป/วิดีโอจากหน้าเว็บ (ยังสั่งผ่าน Claude เท่านั้น)
- โหมดสว่าง / สลับธีม
- ลบ feature subscribers ทั้งหมด

## ทางเลือกที่พิจารณา

| ทางเลือก | ข้อดี | ข้อเสีย |
| --- | --- | --- |
| A: เปลี่ยน token สีอย่างเดียว | งานน้อย | โครงและเนื้อหายังเป็น template ผู้ใช้ปฏิเสธแนวนี้แล้ว |
| B: ออกแบบใหม่ทั้งเว็บ ลบหน้า template | ได้ product ที่ชัด โค้ดที่ไม่ใช้หายไป | งานเยอะ ต้องแก้เทสและกฎใน AGENTS.md |

ผู้ใช้เลือก B + dark studio

## ทางที่เลือก

**Design system**
- พื้นเกือบดำอมม่วงจาง (`oklch(0.145 0.005 285)`), ผิวการ์ดไล่ 2 ระดับ, เส้นขอบบาง
- สีเน้นเดียว: lime สด (`oklch(0.9 0.2 125)`) ใช้กับ action หลักและสถานะ active เท่านั้น
  ให้รูป/วิดีโอเป็นพระเอก สีสถานะ: เสร็จ = เขียวอ่อน, กำลังทำ = amber, ล้ม = แดง
- ฟอนต์ผ่าน `next/font/google`: Space Grotesk (หัวข้อ), Inter (เนื้อหา), JetBrains Mono (key/ชื่อ tool)
- radius เล็กลง (0.75rem) ให้ดูเป็นเครื่องมือ ไม่ใช่เว็บการตลาด
- คง shadcn primitive เดิม (`button`, `card`, `input`, `badge`) แต่ปรับสไตล์ ใช้ token ทั้งหมด

**หน้าแรก (public):** hero + ภาพจำลองแชทที่เรียก tool (CSS ล้วน ไม่ใช้รูปจริงของผู้ใช้เพราะหน้าเป็น
public) + รายการ tools + pipeline (Claude → MCP → KIE → R2 → ประวัติ) + ขั้นตอนต่อ connector

**Gallery:** grid รูปสี่เหลี่ยม, filter เป็นปุ่มลิงก์ (ไม่ต้องมี JS), ปุ่มก๊อป storage key (client component
เล็ก ๆ ตัวเดียว)

## แผนการทำ

1. `globals.css` token ใหม่, `layout.tsx` ฟอนต์ + metadata, `site.ts` เนื้อหา product
2. header/footer ใหม่, ปรับ primitive ใน `components/ui`
3. หน้าแรก, gallery, login ใหม่ + `copy-button.tsx`
4. ลบ `app/guide`, `app/operations`, `page-hero`, `section-card`, `page-shell`, `subscribe-form`
5. เทส unit/e2e + `AGENTS.md`
6. `pnpm check` + ถ่ายภาพหน้าจอด้วย Chromium ส่งให้ผู้ใช้ดูก่อน merge

## ไฟล์ที่คาดว่าจะแตะ

- `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`
- `src/app/gallery/page.tsx`, `src/app/gallery/login/page.tsx`, `src/components/gallery-login-form.tsx`
- `src/components/site-header.tsx`, `site-footer.tsx`, `copy-button.tsx` (ใหม่), `components/ui/*`
- `src/content/site.ts`
- ลบ: `src/app/guide/`, `src/app/operations/`, `src/components/page-hero.tsx`, `section-card.tsx`,
  `page-shell.tsx`, `subscribe-form.tsx`, `tests/unit/site-pages.test.tsx`
- `tests/unit/home-page.test.tsx`, `tests/e2e/home.spec.ts`, `AGENTS.md`

## ความเสี่ยง / ผลกระทบ

- **ผลต่อ schema / API contract:** ไม่มี (API ทั้งหมดเหมือนเดิม)
- **ผลต่อ observability:** ไม่มี
- **route หาย:** `/guide`, `/operations` จะ 404 (ไม่มีใครใช้นอกจาก template)
- **ฟอนต์:** `next/font/google` ดึงฟอนต์ตอน build ต้องมีเน็ต (Vercel/Docker ปกติมี)
- **แผนถอยกลับ:** revert commit

## แผนตรวจสอบ

- [ ] `pnpm check`
- [ ] `pnpm e2e` — อัปเดตเทส แต่ไม่รันชุดเต็ม (DB ร่วมกับ production)
- [ ] `pnpm observability:test` — ไม่แตะ
- [ ] Docker build/run — ไม่แตะ Dockerfile แต่ฟอนต์ใหม่ต้องโหลดตอน build: build runner ให้ผ่าน
- [ ] ภาพหน้าจอทุกหน้า (desktop + mobile) ให้ผู้ใช้ดูก่อน merge
