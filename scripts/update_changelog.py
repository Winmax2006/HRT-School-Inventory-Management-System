with open('docs/CHANGELOG.md', 'r', encoding='utf-8') as f:
    old_changelog = f.read()

new_entry = """# บันทึกการเปลี่ยนแปลงระบบ (System Changelog)
## HRT Inventory System (โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี))

---

### [v2.7.0-rc.2] - 2026-10-28
#### ศูนย์กลางการตั้งค่าระบบ 8 หมวดหมู่ (Settings Hub Level 3), การควบคุมสิทธิ์ RBAC รายเซกชัน และชุดทดสอบความสมบูรณ์ 62 รายการ (Prompt 07)
- **สถานะรุ่น**: `STAGING_RELEASE_CANDIDATE_2` (ผ่านเกณฑ์สำหรับทดสอบใน Staging; ระงับการขึ้น Production ไว้ชั่วคราวเนื่องจากต้องรอข้อมูลประจำตัวจริง)
- **รุ่นก่อนหน้า**: `v2.7.0-rc.1` $\\rightarrow$ ส่งออกจริง: `v2.7.0-rc.2`
- **Git Base Commit**: `dd000c0`
- **ผลการทดสอบอัตโนมัติ**: ผ่าน 62 จาก 62 การทดสอบ (100% Pass Rate) ครอบคลุมทั้ง Regression Suite, P1-P4, P6 Acceptance และ P7 Settings Suite 10 หมวดหมู่

#### สรุปผลงานทางวิศวกรรมรอบ Settings Hub (8 Categories Architecture):
1. **หมวด 1: ข้อมูลสถานศึกษาและหัวเอกสาร (School Profile & Signatories):**
   - เชื่อมโยงข้อมูล `school_name`, `school_short_name`, `school_org`, `school_agency`, `school_address`, `school_phone`, `school_email`
   - กำหนดรูปแบบเลขที่เอกสาร (`document_prefix`, `document_pattern`) และบันทึกชื่อผู้ลงนาม (`officer_name`, `director_name`)
   - ยืนยันการทำงานของ `signatories_snapshot`: เอกสารและใบเบิกในอดีตจะคงสภาพลายเซ็น ณ วันที่จ่ายจริง แม้จะมีการเปลี่ยนผู้บริหารหรือเจ้าหน้าที่ในหน้าตั้งค่าภายหลัง
2. **หมวด 2: ผู้ใช้ การเข้าสู่ระบบ และสิทธิ์ (Users & Granular RBAC):**
   - พัฒนาตารางบริหารจัดการบัญชีผู้ใช้งาน ค้นหา และกรองตามบทบาท (ADMIN, DIRECTOR, OFFICER, REQUESTER)
   - ป้องกันสิทธิ์ระดับเซกชัน: ผู้ใช้บทบาท REQUESTER ถูกปฏิเสธเมื่อพยายามเข้าถึงหรือแก้ไขเซกชันระบบ บัญชี หรือการสำรองข้อมูล
   - เพิ่มระบบป้องกัน Last-Admin Protection: ปฏิเสธการลดสิทธิ์หรือระงับบัญชีผู้ดูแลระบบคนสุดท้ายของระบบอย่างเด็ดขาดทั้งฝั่งเซิร์ฟเวอร์และไคลเอนต์
3. **หมวด 3: ปีงบประมาณ (Fiscal Year Lifecycle):**
   - แยกปีงบประมาณที่กำลังดู (`viewingYear`) ออกจากปีที่เปิดทำธุรกรรม (`activeYear`) อย่างชัดเจน
   - บังคับใช้ Closed-Year Write Lock: ปฏิเสธการสร้างหรืออนุมัติธุรกรรมที่เจาะจงปีงบประมาณที่ปิดรอบบัญชีแล้ว
   - เพิ่ม Modal เตรียมเปิดรอบปีงบประมาณใหม่ตามปฏิทินหลวง (1 ต.ค. - 30 ก.ย.)
4. **หมวด 4: ข้อมูลกลางพัสดุ (Master Data Management):**
   - จัดการข้อมูลฝ่ายงาน/กลุ่มสาระฯ (Departments), คลังพัสดุ (Warehouses), หมวดหมู่ (Categories), และหน่วยนับ (Units)
   - แสดงจำนวนรายการพัสดุที่อ้างอิงข้อมูลกลาง (FK Dependency Count) เพื่อป้องกันการลบข้อมูลที่ยังใช้งานอยู่
   - บังคับใช้ Soft-delete: หากข้อมูลกลางถูกใช้อ้างอิงอยู่ ระบบจะเปลี่ยนสถานะเป็น `INACTIVE` แทนการลบแถว
5. **หมวด 5: กติกาการเบิกและสต็อก (Business Rules & Thresholds):**
   - ตั้งค่าเกณฑ์พาเรโต ABC โดยบังคับความถูกต้องทางตรรกะ $0 < A < B \\le 100$
   - ตรวจสอบระดับสต็อกขั้นต่ำ (Min) และจุดสั่งซื้อซ้ำ (ROP) ห้ามเป็นค่าติดลบ
   - บังคับใช้กฎหน่วยนับ: ปฏิเสธจำนวนทศนิยมในหน่วยนับแบบจำนวนเต็ม (รีม, กล่อง, เล่ม, อัน, ชิ้น) และอนุญาตทศนิยมเฉพาะหน่วยนับต่อเนื่อง (กิโลกรัม, ลิตร, เมตร)
6. **หมวด 6: MiniUI และ QR Code Generator:**
   - สวิตช์ควบคุมระบบ MiniUI: เปิด/ปิดการเบิกด้วยตนเอง, การสแกนดูสารบบ, และการบันทึกร่างออฟไลน์
   - พัฒนาเครื่องมือสร้างป้าย QR Code 4 รูปแบบ: `ITEM`, `ROOM`, `TRACK`, `GENERAL`
   - เพิ่ม Live SVG QR Preview พร้อม Quiet Zone และข้อความกำกับที่อ่านได้
   - เพิ่มหน้าต่างพิมพ์ป้าย QR Code ในรูปแบบมาตรฐาน A4 พร้อมติดจุดบริการ
7. **หมวด 7: การเชื่อมต่อ นำเข้า และสำรองข้อมูล (Connection, Import & Backup):**
   - ปุ่มทดสอบความสมบูรณ์ฐานข้อมูล (Health Check Diagnostic) ตรวจสอบความพร้อมของทั้ง 16 ชีต
   - เครื่องมือตรวจสอบไฟล์นำเข้า CSV (Dry-Run Mode) พร้อมระบบป้องกัน Formula Injection
   - ระบบ Full Backup สร้าง Snapshot ฐานข้อมูลฉุกเฉิน และ Modal ทดสอบกู้คืนข้อมูลแบบ Staging Isolation
8. **หมวด 8: ประวัติและการตรวจสอบระบบ (Audit Trail & System Info):**
   - ตารางบันทึกประวัติการเปลี่ยนแปลงระบบ พร้อมฟิลเตอร์ค้นหาและการตรวจสอบ SHA-256 Hash Chain
   - แสดงข้อมูลจำเพาะระบบ: HRT Inventory System v2.7.0-rc.2 (Baseline v2.6.0)

---
"""

# Replace heading from old changelog
if old_changelog.startswith('# บันทึกการเปลี่ยนแปลงระบบ (System Changelog)'):
    # Strip first 4 lines
    lines = old_changelog.split('\n')
    idx = 0
    for i, line in enumerate(lines):
        if line.startswith('### [v2.7.0-rc.1]'):
            idx = i
            break
    rest = '\n'.join(lines[idx:])
    final_changelog = new_entry + rest
else:
    final_changelog = new_entry + old_changelog

with open('docs/CHANGELOG.md', 'w', encoding='utf-8') as f:
    f.write(final_changelog)

print("Updated docs/CHANGELOG.md successfully")
