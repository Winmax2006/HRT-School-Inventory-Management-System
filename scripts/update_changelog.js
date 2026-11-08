const fs = require('fs');

let changelog = fs.readFileSync('docs/CHANGELOG.md', 'utf8');

const newEntry = `### [v2.7.0-rc.4] - 2026-10-28
#### การแยกโค้ดแอปใช้งานจริงออกจากข้อมูลจำลอง (Clean Code & Mock Data Separation), การกำจัดข้อมูลสังเคราะห์ออกจาก Live Runtime, การสร้าง Standalone Demo Sandbox และชุดทดสอบความสมบูรณ์ 82 รายการ (Prompt 09)
- **สถานะรุ่น**: \`STAGING_RELEASE_CANDIDATE_4\` (ผ่านเกณฑ์สำหรับทดสอบใน Staging; ระงับการขึ้น Production ไว้ชั่วคราวเนื่องจากต้องรอข้อมูลประจำตัวจริง)
- **รุ่นก่อนหน้า**: \`v2.7.0-rc.3\` $\\rightarrow$ ส่งออกจริง: \`v2.7.0-rc.4\`
- **Git Base Commit**: \`dd000c0\`
- **ผลการทดสอบอัตโนมัติ**: ผ่าน 82 จาก 82 การทดสอบ (100% Pass Rate) ครอบคลุมชุดทดสอบ Prompt 00 ถึง Prompt 09 ทั้ง 8 ชุด

#### สรุปผลงานทางวิศวกรรมรอบ Clean Code & Mock Data Separation:
1. **การตรวจสอบและสืบเสาะข้อมูลจำลองเดิม (Mock & Synthetic Data Audit):**
   - สืบเสาะและสกัดข้อมูลพัสดุตัวอย่าง 100 รายการ (\`rawMasterItems\`), ประวัติการเคลื่อนไหว 20 รายการ (\`mockHistories\`), ใบเบิกตัวอย่าง 5 ฉบับ (\`mockRequisitionPresets\`), และรหัสพัสดุมาตรฐาน FSN 7 รายการ (\`fsnData\`) ออกจาก \`index.html\` และ \`frontend/main/App.js\` ไปยังไฟล์ JSON ใน \`tests/fixtures/\`
2. **การชำระล้างรันไทม์จริง (Live Runtime Cleansing):**
   - กำหนดให้ตัวแปรข้อมูลทั้งหมดในรันไทม์จริงเริ่มต้นเป็นอาเรย์ว่างเปล่า (\`[]\`)
   - รองรับสภาวะฐานข้อมูลว่างเปล่าของจริง (Genuine Empty State): แสดงผลคอนเทนเนอร์ \`#tableEmptyState\` พร้อมข้อความแจ้งเตือนอย่างถูกต้อง โดยไม่มีการแอบสร้างข้อมูลเริ่มต้น (Auto-seed) ลงในชีตจริง
3. **การบังคับใช้มาตรการความปลอดภัย Fail-Closed และการกำจัดอัตลักษณ์จำลอง:**
   - กำจัดอัตลักษณ์จำลองนายอนันต์ (\`USR-ANANT-01\`) ออกจาก \`UserApi\` และบันทึก Audit Trail อย่างสมบูรณ์; หากผู้ใช้ยังไม่เข้าสู่ระบบ \`UserApi.getCurrentUser()\` จะส่งคืน \`null\` ทันที และบันทึกผู้กระทำเป็น \`SYSTEM_ANONYMOUS\`
   - ยกเลิกระบบจำลองการเรียกใช้งานเงียบ (\`mockDispatcher\`) ใน \`ApiServiceCore\`; หากเปิดใช้งานนอกสภาพแวดล้อม Google Apps Script จะ Reject ด้วย Error Code \`BACKEND_UNAVAILABLE\` เพื่อป้องกันความเข้าใจผิดของผู้ใช้
   - ป้องกันการปลอมแปลงสิทธิ์ (Role Spoofing) ผ่าน URL Parameters หรือ LocalStorage อย่างเคร่งครัด
4. **การพัฒนา Test Fixtures และ In-Memory Adapters:**
   - พัฒนา \`tests/fixtures/synthetic_fixtures.js\` และ \`tests/adapters/in_memory_repository.js\` เพื่อจำลองคลังพัสดุ ใบเบิก สิทธิ์ผู้ใช้ นาฬิการะบบ และตัวสร้างรหัสสำหรับรันชุดทดสอบโดยไม่พึ่งพา Google Sheets จริง
5. **การสร้างทางเข้าสาธิตระบบแยกเดี่ยว (Standalone Demo Entry Point):**
   - พัฒนาสคริปต์ \`scripts/build_demo_html.js\` และสร้างไฟล์ \`demo.html\` ที่มีแบนเนอร์แจ้งเตือน \`[DEMO & TESTING MODE]\` ด้านบนสุด พร้อมตัวแปร \`window.__DEMO_STORE__\` และปุ่มสลับบทบาทผู้ใช้ (\`window.switchDemoUserPrompt()\`) ในหน่วยความจำอย่างปลอดภัย
6. **การพัฒนาชุดทดสอบความสมบูรณ์ 10 สถานการณ์ (Prompt 09 Separation Suite):**
   - พัฒนา \`tests/p9_clean_separation_test.js\` ครอบคลุม 10 กรณีทดสอบหลัก ส่งผลให้ผ่านการทดสอบอัตโนมัติครบถ้วน 82/82 รายการ (100%)

---

`;

const targetIdx = changelog.indexOf('### [v2.7.0-rc.3]');
if (targetIdx !== -1) {
  changelog = changelog.slice(0, targetIdx) + newEntry + changelog.slice(targetIdx);
  fs.writeFileSync('docs/CHANGELOG.md', changelog, 'utf8');
  console.log('Successfully updated CHANGELOG.md with v2.7.0-rc.4');
} else {
  console.error('Target index not found in CHANGELOG.md');
}
