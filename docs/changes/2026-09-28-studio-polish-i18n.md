# ยกระดับหน้าตา Heenzaa Studio และรองรับ 2 ภาษา (ไทย/อังกฤษ)

- **วันที่:** 2026-09-28
- **Design doc:** `docs/design/2026-09-28-studio-polish-i18n.md`
- **Commit / PR:** PR #7 (branch `feat/gallery`)

## เปลี่ยนอะไร

หน้าแรกใช้ภาพ showcase จริง 6 ภาพที่สร้างด้วย GPT Image (hero แบบภาพซ้อน, แถบภาพเลื่อน,
การ์ด tool เด่นมีภาพพื้นหลัง), พื้นหลัง aurora/grid/grain, ข้อความ gradient; gallery เป็น
masonry แสดงรูปตามสัดส่วนจริงพร้อม overlay; หน้า login มีภาพประกอบ ทั้งเว็บรองรับไทย/อังกฤษ
ด้วยปุ่มสลับ TH/EN (cookie `lang`, ค่าเริ่มต้นไทย) และฟอนต์ไทย Anuphan

## ทำไม

ผู้ใช้ขอให้สวยกว่ารอบแรกและมี 2 ภาษา หน้าแรกรอบก่อนไม่มีภาพจริง และ gallery ครอบรูปเป็นสี่เหลี่ยม

## ไฟล์ที่แตะ

| ไฟล์ | สิ่งที่ทำ |
| --- | --- |
| `public/showcase/*.webp` | ใหม่ — 6 ภาพ (จาก PNG รวม ~15 MB เหลือ WebP ~880 KB) |
| `src/content/i18n/en.ts`, `th.ts`, `index.ts` | ใหม่ — dictionary + การเลือกภาษา |
| `src/server/i18n.ts`, `src/app/i18n-actions.ts`, `src/components/language-switcher.tsx` | ใหม่ — อ่านภาษา, action สลับภาษา, ปุ่ม TH/EN |
| `src/content/site.ts` | เหลือข้อมูลที่ไม่ขึ้นกับภาษา + รายการภาพ showcase |
| `src/app/globals.css` | ฟอนต์ไทยในชุดฟอนต์, backdrop, `.text-gradient`, `.glass`, `.eyebrow`, marquee/float |
| `src/app/layout.tsx` | ฟอนต์ Anuphan, `html lang`, metadata ตามภาษา, backdrop |
| `src/components/home-view.tsx` (ใหม่), `src/app/page.tsx` | หน้าแรกใหม่ แยกส่วนแสดงผลให้เทสได้ |
| `src/app/gallery/page.tsx`, `login/page.tsx`, `actions.ts`, `src/components/gallery-login-form.tsx` | masonry, ข้อความ 2 ภาษา, เวลาเป็นเวลาไทย, error ตามภาษา |
| `src/components/site-header.tsx`, `site-footer.tsx`, `copy-button.tsx`, `endpoint-url.tsx` | 2 ภาษา + ปรับหน้าตา |
| `tests/unit/i18n.test.ts` (ใหม่), `home-page.test.tsx`, `tests/e2e/home.spec.ts` | เทส dictionary, การเลือกภาษา, หน้าแรกทั้ง 2 ภาษา |
| `AGENTS.md` | กฎ i18n และการไม่เว้นระยะตัวอักษรภาษาไทย |

## ต่างจากแผนตรงไหน

- ภาพ moon-cart: สคริปต์เลิกรอที่ 300s ทั้งที่ KIE ยังสร้างอยู่ ดึงผลจาก task เดิมทีหลังแทนการสั่งใหม่
- เจอจากภาพหน้าจอแล้วแก้: letter-spacing ทำให้ภาษาไทยแตกเป็นตัว ๆ (เพิ่ม `.eyebrow` ที่ปิด
  tracking บนหน้าไทย), เมนูภาษาไทยตกบรรทัดบนมือถือ, ไอคอนค้นหาโดน input ทับ, การ์ด login อยู่ต่ำ
- ชื่อหัวข้อหลักสองบรรทัดถูกอ่านติดกัน ("videojust") ใส่ช่องว่างคั่นให้ screen reader อ่านถูก

## ตรวจสอบแล้ว

- [x] `pnpm check` — lint + typecheck + test ผ่าน (102/102)
- [ ] `pnpm e2e` — อัปเดตแล้ว ไม่รันชุดเต็ม (DB ร่วมกับ production)
- [x] Docker build `runner` ผ่าน (ฟอนต์ไทยโหลดได้ตอน build)

ผลลัพธ์ / สิ่งที่ยังค้าง:
- ภาพหน้าจอ Chromium ทุกหน้า × ไทย/อังกฤษ × desktop/มือถือ: `html lang` และ title ตามภาษา,
  ไม่มี error ใน console ไม่มี request ล้ม
- เทสบางตัว timeout เป็นบางรอบเมื่อเครื่องช้า (อาการเดิม) รันซ้ำผ่าน

## ตามมาทีหลัง

- thumbnail ของรูปใน gallery, เพิ่ม `testTimeout` ให้เทสหน้าเว็บ
