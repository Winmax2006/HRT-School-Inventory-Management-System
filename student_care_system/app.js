/**
 * MODULE 02 — STUDENT SCREENING & RISK INTERVENTION SYSTEM
 * ระบบการคัดกรองนักเรียนและจำแนกกลุ่มความเสี่ยง (Student Support & Care System)
 * โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) สังกัด อบจ.สระบุรี / สพฐ.
 */

// ============================================================================
// 1. DATA STORES & INITIAL CONSTANTS
// ============================================================================

// Roles and Current Active User for RBAC (STEP 08)
const USERS = {
    ADVISOR_M1_1: {
        id: "T-0101",
        name: "ครูสมศรี มีสุข",
        role: "ADVISOR",
        roleTitle: "ครูที่ปรึกษาประจำชั้น ม.1/1",
        assignedGrade: "ม.1",
        assignedClass: "1/1",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80"
    },
    ADVISOR_M2_1: {
        id: "T-0201",
        name: "ครูมานพ ขยันยิ่ง",
        role: "ADVISOR",
        roleTitle: "ครูที่ปรึกษาประจำชั้น ม.2/1",
        assignedGrade: "ม.2",
        assignedClass: "2/1",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80"
    },
    COUNSELOR: {
        id: "T-GUIDE",
        name: "ครูวิภา รักษ์เด็ก",
        role: "COUNSELOR",
        roleTitle: "ครูแนะแนว / หัวหน้างานแนะแนว",
        assignedGrade: "ALL",
        assignedClass: "ALL",
        avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80"
    },
    EXECUTIVE: {
        id: "DIR-001",
        name: "ดร.สมศักดิ์ รุ่งเรือง",
        role: "EXECUTIVE",
        roleTitle: "ผู้อำนวยการโรงเรียนหรเทพฯ",
        assignedGrade: "ALL",
        assignedClass: "ALL",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80"
    },
    GRADE_HEAD_M1: {
        id: "T-HEAD-M1",
        name: "ครูประเสริฐ สอนดี",
        role: "GRADE_HEAD",
        roleTitle: "หัวหน้าระดับชั้น ม.1",
        assignedGrade: "ม.1",
        assignedClass: "ALL",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80"
    },
    CARE_COMMITTEE: {
        id: "T-CARE",
        name: "ครูธงชัย ใจมั่นคง",
        role: "CARE_COMMITTEE",
        roleTitle: "หัวหน้างานระบบดูแลช่วยเหลือนักเรียน",
        assignedGrade: "ALL",
        assignedClass: "ALL",
        avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=80"
    }
};

let currentUser = USERS.ADVISOR_M1_1;

// STEP 01 — Screening Tools Store
let screeningTools = [
    {
        toolId: "TOOL-SDQ-2567",
        toolName: "แบบประเมินจุดเด่นและจุดด้อย (SDQ) ฉบับครูประเมิน",
        version: "v2.1 (สพฐ. 2567)",
        description: "เครื่องมือคัดกรองพฤติกรรมและอารมณ์ 25 ข้อ ครอบคลุม 5 ด้าน: อารมณ์, พฤติกรรมเกเร, สมาธิสั้น, เพื่อน, และสังคม",
        scoringMethod: "SUM_CUTOFF_MULTI_DOMAIN",
        minScore: 0,
        maxScore: 40,
        categories: [
            { id: "emotional", name: "ด้านอารมณ์", max: 10, cutoffRisk: 5, cutoffProblem: 7 },
            { id: "conduct", name: "ด้านความประพฤติ/เกเร", max: 10, cutoffRisk: 4, cutoffProblem: 6 },
            { id: "hyperactivity", name: "ด้านความซน/สมาธิสั้น", max: 10, cutoffRisk: 6, cutoffProblem: 8 },
            { id: "peer", name: "ด้านความสัมพันธ์กับเพื่อน", max: 10, cutoffRisk: 4, cutoffProblem: 6 },
            { id: "prosocial", name: "ด้านสัมพันธภาพทางสังคม", max: 10, cutoffRisk: 4, cutoffProblem: 2, inverted: true }
        ],
        activeStatus: "ACTIVE"
    },
    {
        toolId: "TOOL-OBEC-4D",
        toolName: "แบบคัดกรองนักเรียนรายบุคคล 4 ด้าน (สพฐ.)",
        version: "v1.4 (2567)",
        description: "คัดกรองความจำเป็นในการช่วยเหลือ 4 มิติ: ด้านการเรียน, ด้านสุขภาพร่างกาย/จิตใจ, ด้านเศรษฐกิจ/ครอบครัว, และด้านความปลอดภัย/พฤติกรรมเสี่ยง",
        scoringMethod: "MULTI_DIMENSION_INDICATORS",
        minScore: 0,
        maxScore: 20,
        categories: [
            { id: "academic", name: "ด้านการเรียน", max: 5, cutoffRisk: 3, cutoffProblem: 4 },
            { id: "health", name: "ด้านสุขภาพร่างกายและจิตใจ", max: 5, cutoffRisk: 2, cutoffProblem: 4 },
            { id: "family_economy", name: "ด้านเศรษฐกิจและครอบครัว", max: 5, cutoffRisk: 3, cutoffProblem: 4 },
            { id: "protection_safety", name: "ด้านความคุ้มครองความปลอดภัย", max: 5, cutoffRisk: 2, cutoffProblem: 3 }
        ],
        activeStatus: "ACTIVE"
    },
    {
        toolId: "TOOL-EQ-DEPT",
        toolName: "แบบประเมินความฉลาดทางอารมณ์ (EQ วัยรุ่น)",
        version: "v3.0 (กรมสุขภาพจิต)",
        description: "ประเมินความสามารถทางอารมณ์ 3 ด้านหลัก: ดี (Good), เก่ง (Smart), สุข (Happy)",
        scoringMethod: "STANDARD_T_SCORE",
        minScore: 0,
        maxScore: 72,
        categories: [
            { id: "good", name: "ด้านความดี (Good)", max: 24, cutoffRisk: 12, cutoffProblem: 8, inverted: true },
            { id: "smart", name: "ด้านความเก่ง (Smart)", max: 24, cutoffRisk: 12, cutoffProblem: 8, inverted: true },
            { id: "happy", name: "ด้านความสุข (Happy)", max: 24, cutoffRisk: 12, cutoffProblem: 8, inverted: true }
        ],
        activeStatus: "ACTIVE"
    },
    {
        toolId: "TOOL-2Q-9Q",
        toolName: "แบบคัดกรองโรคซึมเศร้าและความเสี่ยงทำร้ายตนเอง (2Q/9Q/8Q)",
        version: "v2.0 (กรมสุขภาพจิต)",
        description: "เครื่องมือประเมินความเสี่ยงต่อภาวะซึมเศร้าและวิกฤตสุขภาพจิตเร่งด่วนในโรงเรียน",
        scoringMethod: "CRITICAL_GATEWAY",
        minScore: 0,
        maxScore: 27,
        categories: [
            { id: "depression_2q", name: "คัดกรองเบื้องต้น (2Q)", max: 2, cutoffRisk: 1, cutoffProblem: 2 },
            { id: "depression_9q", name: "ระดับความรุนแรง (9Q)", max: 27, cutoffRisk: 7, cutoffProblem: 13 }
        ],
        activeStatus: "ACTIVE"
    }
];

// STEP 02 — Screening Sessions Store
let screeningSessions = [
    {
        screeningId: "SCR-2567-T1-M1-1",
        academicYear: 2567,
        semester: 1,
        grade: "ม.1",
        class: "1/1",
        toolId: "TOOL-SDQ-2567",
        startDate: "2024-05-20",
        endDate: "2024-06-15",
        createdBy: "T-GUIDE (ครูวิภา รักษ์เด็ก)",
        status: "COMPLETED",
        notes: "การคัดกรองต้นปีการศึกษา 2567 ม.1/1 ครบทุกรายบุคคล ดำเนินการรับรองแล้ว"
    },
    {
        screeningId: "SCR-2567-T1-M1-2",
        academicYear: 2567,
        semester: 1,
        grade: "ม.1",
        class: "1/2",
        toolId: "TOOL-SDQ-2567",
        startDate: "2024-05-20",
        endDate: "2024-06-15",
        createdBy: "T-GUIDE (ครูวิภา รักษ์เด็ก)",
        status: "REVIEWED",
        notes: "ครูแนะแนวตรวจสอบผลแล้ว รอผู้บริหารลงนามปิดรอบ"
    },
    {
        screeningId: "SCR-2567-T1-M2-1",
        academicYear: 2567,
        semester: 1,
        grade: "ม.2",
        class: "2/1",
        toolId: "TOOL-SDQ-2567",
        startDate: "2024-06-01",
        endDate: "2024-06-30",
        createdBy: "T-GUIDE (ครูวิภา รักษ์เด็ก)",
        status: "IN_PROGRESS",
        notes: "เปิดให้ครูที่ปรึกษาบันทึกคะแนนคัดกรองพฤติกรรม"
    },
    {
        screeningId: "SCR-2567-T1-M3-1",
        academicYear: 2567,
        semester: 1,
        grade: "ม.3",
        class: "3/1",
        toolId: "TOOL-OBEC-4D",
        startDate: "2024-06-10",
        endDate: "2024-07-10",
        createdBy: "T-GUIDE (ครูวิภา รักษ์เด็ก)",
        status: "SUBMITTED",
        notes: "ครูประจำชั้นกรอกผลครบแล้ว ส่งให้งานแนะแนวตรวจสอบ"
    },
    {
        screeningId: "SCR-2567-T1-M4-1",
        academicYear: 2567,
        semester: 1,
        grade: "ม.4",
        class: "4/1",
        toolId: "TOOL-SDQ-2567",
        startDate: "2024-07-01",
        endDate: "2024-07-31",
        createdBy: "T-GUIDE (ครูวิภา รักษ์เด็ก)",
        status: "DRAFT",
        notes: "ร่างรอบการประเมินสำหรับชั้น ม.4 ภาคเรียนที่ 1"
    }
];

// Student Mock Database
let students = [
    {
        studentId: "STD-670101",
        nationalId: "1-1999-00123-45-1",
        name: "เด็กชายธนากร เกียรติสกุล",
        nickname: "ต้น",
        gender: "ชาย",
        grade: "ม.1",
        class: "1/1",
        number: 1,
        advisor: "ครูสมศรี มีสุข",
        gpa: "3.45",
        attendanceRate: "98.5%",
        parentName: "นายวิชัย เกียรติสกุล",
        parentPhone: "081-234-5678",
        avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&auto=format&fit=crop&q=80"
    },
    {
        studentId: "STD-670102",
        nationalId: "1-1999-00234-56-2",
        name: "เด็กหญิงกานดา สุวรรณรัตน์",
        nickname: "แก้ม",
        gender: "หญิง",
        grade: "ม.1",
        class: "1/1",
        number: 2,
        advisor: "ครูสมศรี มีสุข",
        gpa: "2.15",
        attendanceRate: "78.0%",
        parentName: "นางสมพร สุวรรณรัตน์",
        parentPhone: "082-345-6789",
        avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80"
    },
    {
        studentId: "STD-670103",
        nationalId: "1-1999-00345-67-3",
        name: "เด็กชายณัฐพงษ์ วงศ์สว่าง",
        nickname: "น็อต",
        gender: "ชาย",
        grade: "ม.1",
        class: "1/1",
        number: 3,
        advisor: "ครูสมศรี มีสุข",
        gpa: "1.80",
        attendanceRate: "65.5%",
        parentName: "นายประเสริฐ วงศ์สว่าง",
        parentPhone: "083-456-7890",
        avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&auto=format&fit=crop&q=80"
    },
    {
        studentId: "STD-670104",
        nationalId: "1-1999-00456-78-4",
        name: "เด็กหญิงพิมพา บริสุทธิ์",
        nickname: "พลอย",
        gender: "หญิง",
        grade: "ม.1",
        class: "1/1",
        number: 4,
        advisor: "ครูสมศรี มีสุข",
        gpa: "3.85",
        attendanceRate: "100%",
        parentName: "นางรัตนา บริสุทธิ์",
        parentPhone: "084-567-8901",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80"
    },
    {
        studentId: "STD-670105",
        nationalId: "1-1999-00567-89-5",
        name: "เด็กชายศิรวิชญ์ บำรุงจิต",
        nickname: "กอล์ฟ",
        gender: "ชาย",
        grade: "ม.1",
        class: "1/1",
        number: 5,
        advisor: "ครูสมศรี มีสุข",
        gpa: "2.50",
        attendanceRate: "85.0%",
        parentName: "นายชูชัย บำรุงจิต",
        parentPhone: "085-678-9012",
        avatar: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=120&auto=format&fit=crop&q=80"
    },
    {
        studentId: "STD-670106",
        nationalId: "1-1999-00678-90-6",
        name: "เด็กชายวรินทร ชัยชนะ",
        nickname: "บอส",
        gender: "ชาย",
        grade: "ม.1",
        class: "1/2",
        number: 1,
        advisor: "ครูมานพ ขยันยิ่ง",
        gpa: "3.10",
        attendanceRate: "95.0%",
        parentName: "นายสนอง ชัยชนะ",
        parentPhone: "086-789-0123",
        avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80"
    },
    {
        studentId: "STD-670107",
        nationalId: "1-1999-00789-01-7",
        name: "เด็กหญิงชญานิษฐ์ ทรัพย์มาก",
        nickname: "เนย",
        gender: "หญิง",
        grade: "ม.1",
        class: "1/2",
        number: 2,
        advisor: "ครูมานพ ขยันยิ่ง",
        gpa: "2.90",
        attendanceRate: "90.0%",
        parentName: "นางมณี ทรัพย์มาก",
        parentPhone: "087-890-1234",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
    },
    {
        studentId: "STD-670201",
        nationalId: "1-1999-00890-12-8",
        name: "เด็กชายกิตติกร มั่นใจ",
        nickname: "เต้",
        gender: "ชาย",
        grade: "ม.2",
        class: "2/1",
        number: 1,
        advisor: "ครูมานพ ขยันยิ่ง",
        gpa: "2.30",
        attendanceRate: "82.5%",
        parentName: "นายประวิทย์ มั่นใจ",
        parentPhone: "088-901-2345",
        avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&auto=format&fit=crop&q=80"
    },
    {
        studentId: "STD-670202",
        nationalId: "1-1999-00901-23-9",
        name: "เด็กหญิงอภิชญา เจริญผล",
        nickname: "มายด์",
        gender: "หญิง",
        grade: "ม.2",
        class: "2/1",
        number: 2,
        advisor: "ครูมานพ ขยันยิ่ง",
        gpa: "1.95",
        attendanceRate: "70.0%",
        parentName: "นางอรนุช เจริญผล",
        parentPhone: "089-012-3456",
        avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&auto=format&fit=crop&q=80"
    },
    {
        studentId: "STD-670301",
        nationalId: "1-1999-01012-34-0",
        name: "เด็กชายจิรภัทร บุญประเสริฐ",
        nickname: "อาร์ม",
        gender: "ชาย",
        grade: "ม.3",
        class: "3/1",
        number: 1,
        advisor: "ครูจันทนา วงศ์งาม",
        gpa: "2.75",
        attendanceRate: "93.0%",
        parentName: "นายอำนาจ บุญประเสริฐ",
        parentPhone: "080-123-4567",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80"
    }
];

// STEP 03 & 04 — Screening Results Store
let screeningResults = [
    {
        resultId: "RES-67-01",
        studentId: "STD-670101",
        screeningId: "SCR-2567-T1-M1-1",
        score: 6,
        subScores: { emotional: 1, conduct: 1, hyperactivity: 2, peer: 2, prosocial: 8 },
        category: "ภาพรวมทุกด้านอยู่ในเกณฑ์ปกติ",
        riskLevel: "NORMAL",
        riskFactors: [],
        reasoning: "ผลการประเมิน SDQ รวม 6 คะแนน (เกณฑ์ปกติ 0-15) และคะแนนรายด้านอยู่ในเกณฑ์ปกติทุกมิติ มีสัมพันธภาพทางสังคมดีเยี่ยม ไม่พบพฤติกรรมเสี่ยง",
        recordedBy: "T-0101 (ครูสมศรี มีสุข)",
        recordedAt: "2024-05-25 10:30",
        evidenceNotes: "นักเรียนเข้าเรียนสม่ำเสมอ ร่าเริง ให้ความร่วมมือในกิจกรรมห้องเรียนอย่างดียิ่ง"
    },
    {
        resultId: "RES-67-02",
        studentId: "STD-670102",
        screeningId: "SCR-2567-T1-M1-1",
        score: 18,
        subScores: { emotional: 5, conduct: 3, hyperactivity: 4, peer: 6, prosocial: 4 },
        category: "ด้านอารมณ์และสัมพันธภาพกับเพื่อน",
        riskLevel: "RISK",
        riskFactors: ["SDQ_PEER_HIGH", "SDQ_EMOTIONAL_BORDER", "ATTENDANCE_DROP"],
        reasoning: "จัดอยู่ใน 'กลุ่มเสี่ยง (RISK)' เนื่องจากคะแนนด้านความสัมพันธ์กับเพื่อนสูงถึง 6/10 (เกณฑ์เสี่ยง 4-5) และคะแนนด้านอารมณ์ 5/10 ร่วมกับสถิติขาดเรียนต่อเนื่อง 4 วันต่อเดือนและมีอาการวิตกกังวลแยกตัวจากกลุ่มเพื่อน",
        recordedBy: "T-0101 (ครูสมศรี มีสุข)",
        recordedAt: "2024-05-26 14:15",
        evidenceNotes: "ครูผู้สอนสังเกตว่านักเรียนไม่พูดคุยกับเพื่อนในกลุ่ม แยกนั่งรับประทานอาหารคนเดียว และผลการเรียนเริ่มตกต่ำลง"
    },
    {
        resultId: "RES-67-03",
        studentId: "STD-670103",
        screeningId: "SCR-2567-T1-M1-1",
        score: 25,
        subScores: { emotional: 8, conduct: 6, hyperactivity: 7, peer: 4, prosocial: 3 },
        category: "ด้านอารมณ์, พฤติกรรมเกเร และสมาธิสั้น (วิกฤตหลายมิติ)",
        riskLevel: "PROBLEM",
        riskFactors: ["SDQ_EMOTIONAL_CRITICAL", "SDQ_CONDUCT_CRITICAL", "CHRONIC_ABSENTEEISM", "DOMESTIC_DIFFICULTY"],
        reasoning: "จัดอยู่ใน 'กลุ่มมีปัญหา (PROBLEM)' ระดับวิกฤต เนื่องจากคะแนน SDQ รวมสูงถึง 25/40 คะแนนด้านอารมณ์อยู่ในขั้นมีปัญหา (8/10) และด้านพฤติกรรมเกเร (6/10) นักเรียนมีสถิติขาดเรียนสูงถึง 34.5% ประกอบกับปัญหาความรุนแรงในครอบครัว",
        recordedBy: "T-0101 (ครูสมศรี มีสุข)",
        recordedAt: "2024-05-27 11:00",
        evidenceNotes: "นักเรียนมาเรียนสายบ่อยครั้ง แสดงอารมณ์ฉุนเฉียวรุนแรงเมื่อถูกตักเตือน และพบบาดแผลฟกช้ำตามร่างกายจากการสอบถามเบื้องต้น"
    },
    {
        resultId: "RES-67-04",
        studentId: "STD-670104",
        screeningId: "SCR-2567-T1-M1-1",
        score: 3,
        subScores: { emotional: 0, conduct: 1, hyperactivity: 1, peer: 1, prosocial: 9 },
        category: "ปกติ / ส่งเสริมความเป็นเลิศ",
        riskLevel: "NORMAL",
        riskFactors: [],
        reasoning: "คะแนน SDQ รวม 3 คะแนน อยู่ในกลุ่มปกติอย่างสมบูรณ์ อารมณ์แจ่มใส เป็นผู้นำกลุ่มและช่วยเหลือเพื่อนร่วมชั้นสม่ำเสมอ",
        recordedBy: "T-0101 (ครูสมศรี มีสุข)",
        recordedAt: "2024-05-27 15:40",
        evidenceNotes: "ผลการเรียนดีเด่น เป็นหัวหน้าห้องและมีจิตอาสาช่วยเหลืองานโรงเรียน"
    },
    {
        resultId: "RES-67-05",
        studentId: "STD-670105",
        screeningId: "SCR-2567-T1-M1-1",
        score: 14,
        subScores: { emotional: 3, conduct: 3, hyperactivity: 5, peer: 3, prosocial: 6 },
        category: "ด้านสมาธิสั้นและการเรียน (เฝ้าระวัง)",
        riskLevel: "WATCH",
        riskFactors: ["SDQ_HYPER_BORDER", "ACADEMIC_INATTENTION"],
        reasoning: "จัดอยู่ใน 'กลุ่มเฝ้าระวัง (WATCH)' เนื่องจากคะแนนด้านความซน/สมาธิสั้นคาบเกี่ยวเกณฑ์เสี่ยง (5/10) วอกแวกง่ายในชั่วโมงเรียนวิชาคำนวณ แต่ยังไม่กระทบพฤติกรรมโดยรวมและไม่มีพฤติกรรมก้าวร้าว",
        recordedBy: "T-0101 (ครูสมศรี มีสุข)",
        recordedAt: "2024-05-28 09:20",
        evidenceNotes: "มักลุกจากที่นั่งบ่อยครั้งในชั่วโมงเรียน ต้องได้รับการกระตุ้นความสนใจเป็นระยะ"
    }
];

// STEP 07 — Action Required Store (Auto-generated & Managed)
let actionRequiredList = [
    {
        actionId: "ACT-2567-001",
        studentId: "STD-670102",
        screeningId: "SCR-2567-T1-M1-1",
        riskLevel: "RISK",
        actionType: "พูดคุยรายบุคคลและให้คำปรึกษา",
        title: "พูดคุยรายบุคคลเพื่อประเมินภาวะอารมณ์และสัมพันธภาพกับเพื่อน",
        description: "สืบเนื่องจากผลการประเมิน SDQ พบความเสี่ยงด้านเพื่อน (6/10) และด้านอารมณ์ ดำเนินการนัดหมายพูดคุยเชิงจิตวิทยาเบื้องต้น สังเกตพฤติกรรม และประสานกลุ่มเพื่อนเพื่อสร้างบรรยากาศสนับสนุน",
        assignedRole: "ADVISOR",
        assignedPerson: "ครูสมศรี มีสุข (ครูที่ปรึกษา)",
        priority: "HIGH",
        dueDate: "2024-06-10",
        status: "IN_PROGRESS",
        createdAt: "2024-05-26 14:15",
        outcomeNotes: "นัดหมายพูดคุยรอบแรกแล้วเมื่อ 30 พ.ค. นักเรียนเริ่มเปิดใจว่ามีความขัดแย้งกับเพื่อนในกลุ่มเดิม กำลังประสานกิจกรรมจับคู่เพื่อนช่วยเพื่อน"
    },
    {
        actionId: "ACT-2567-002",
        studentId: "STD-670103",
        screeningId: "SCR-2567-T1-M1-1",
        riskLevel: "PROBLEM",
        actionType: "ติดตามนักเรียนและเยี่ยมบ้านฉุกเฉิน",
        title: "ลงพื้นที่เยี่ยมบ้านด่วน และส่งต่องานแนะแนวเพื่อประเมิน 2Q/9Q",
        description: "นักเรียนเข้าข่ายกลุ่มมีปัญหาวิกฤต (SDQ 25 คะแนน) มีแนวโน้มภาวะซึมเศร้าและขาดเรียนเรื้อรัง ต้องลงพื้นที่ตรวจสอบสภาพความเป็นอยู่ ร่วมกับประสานครูแนะแนวและนักจิตวิทยาโรงเรียน",
        assignedRole: "COUNSELOR",
        assignedPerson: "ครูวิภา รักษ์เด็ก (ครูแนะแนว)",
        priority: "CRITICAL",
        dueDate: "2024-06-05",
        status: "PENDING",
        createdAt: "2024-05-27 11:00",
        outcomeNotes: ""
    }
];

// ============================================================================
// 2. RISK CLASSIFICATION & REASONING ENGINE (STEP 04)
// ============================================================================

function classifyStudentRisk(toolId, subScores, attendanceRate, extraIndicators = []) {
    const tool = screeningTools.find(t => t.toolId === toolId) || screeningTools[0];
    let totalScore = 0;
    let riskLevel = "NORMAL";
    let riskFactors = [];
    let reasons = [];

    if (tool.toolId === "TOOL-SDQ-2567") {
        const emo = parseInt(subScores.emotional) || 0;
        const cond = parseInt(subScores.conduct) || 0;
        const hyper = parseInt(subScores.hyperactivity) || 0;
        const peer = parseInt(subScores.peer) || 0;
        const prosocial = subScores.prosocial !== undefined ? (parseInt(subScores.prosocial) || 0) : 10;

        totalScore = emo + cond + hyper + peer;

        if (emo >= 7) {
            riskFactors.push("SDQ_EMOTIONAL_PROBLEM");
            reasons.push(`คะแนนด้านอารมณ์อยู่ในระดับมีปัญหา (${emo}/10, เกณฑ์วิกฤต >= 7)`);
        } else if (emo >= 5) {
            riskFactors.push("SDQ_EMOTIONAL_RISK");
            reasons.push(`คะแนนด้านอารมณ์อยู่ในระดับเสี่ยง (${emo}/10, เกณฑ์เสี่ยง 5-6)`);
        }

        if (cond >= 6) {
            riskFactors.push("SDQ_CONDUCT_PROBLEM");
            reasons.push(`คะแนนด้านความประพฤติ/เกเรอยู่ในระดับมีปัญหา (${cond}/10, เกณฑ์วิกฤต >= 6)`);
        } else if (cond >= 4) {
            riskFactors.push("SDQ_CONDUCT_RISK");
            reasons.push(`คะแนนด้านความประพฤติอยู่ในระดับเสี่ยง (${cond}/10, เกณฑ์เสี่ยง 4-5)`);
        }

        if (hyper >= 8) {
            riskFactors.push("SDQ_HYPER_PROBLEM");
            reasons.push(`คะแนนด้านความซน/สมาธิสั้นอยู่ในระดับมีปัญหา (${hyper}/10, เกณฑ์วิกฤต >= 8)`);
        } else if (hyper >= 6) {
            riskFactors.push("SDQ_HYPER_RISK");
            reasons.push(`คะแนนด้านความซน/สมาธิสั้นอยู่ในระดับเสี่ยง (${hyper}/10, เกณฑ์เสี่ยง 6-7)`);
        }

        if (peer >= 6) {
            riskFactors.push("SDQ_PEER_PROBLEM");
            reasons.push(`คะแนนด้านสัมพันธภาพกับเพื่อนอยู่ในระดับมีปัญหา (${peer}/10, เกณฑ์วิกฤต >= 6)`);
        } else if (peer >= 4) {
            riskFactors.push("SDQ_PEER_RISK");
            reasons.push(`คะแนนด้านสัมพันธภาพกับเพื่อนอยู่ในระดับเสี่ยง (${peer}/10, เกณฑ์เสี่ยง 4-5)`);
        }

        if (prosocial <= 2) {
            riskFactors.push("SDQ_PROSOCIAL_LOW");
            reasons.push(`พฤติกรรมสัมพันธภาพทางสังคมต่ำมาก (${prosocial}/10) ขาดการมีส่วนร่วม`);
        }

        const attNum = parseFloat(attendanceRate) || 100;
        if (attNum < 70) {
            riskFactors.push("ATTENDANCE_CRITICAL");
            reasons.push(`สถิติการมาเรียนต่ำวิกฤต (${attNum}%, ขาดเรียนเกินเกณฑ์ 30%)`);
        } else if (attNum < 85) {
            riskFactors.push("ATTENDANCE_WARNING");
            reasons.push(`สถิติการมาเรียนเริ่มต่ำกว่าเกณฑ์ (${attNum}%)`);
        }

        if (extraIndicators && extraIndicators.length > 0) {
            extraIndicators.forEach(ind => {
                riskFactors.push(ind.code || "CUSTOM_RISK");
                reasons.push(ind.text || ind);
            });
        }

        if (totalScore >= 20 || emo >= 8 || cond >= 7 || attNum < 70 || (extraIndicators.some(i => i.isCritical))) {
            riskLevel = "PROBLEM";
        } else if (totalScore >= 16 || emo >= 5 || cond >= 4 || hyper >= 6 || peer >= 5 || attNum < 85) {
            riskLevel = "RISK";
        } else if (totalScore >= 12 || emo === 4 || cond === 3 || hyper === 5 || peer === 4) {
            riskLevel = "WATCH";
        } else {
            riskLevel = "NORMAL";
        }

    } else {
        totalScore = Object.values(subScores).reduce((a, b) => (parseInt(a)||0) + (parseInt(b)||0), 0);
        if (totalScore >= tool.maxScore * 0.6) {
            riskLevel = "PROBLEM";
            reasons.push(`คะแนนรวม ${totalScore}/${tool.maxScore} สูงเกิน 60% ของแบบประเมิน`);
        } else if (totalScore >= tool.maxScore * 0.4) {
            riskLevel = "RISK";
            reasons.push(`คะแนนรวม ${totalScore}/${tool.maxScore} เข้าข่ายกลุ่มเสี่ยง`);
        } else if (totalScore >= tool.maxScore * 0.25) {
            riskLevel = "WATCH";
            reasons.push(`คะแนนรวม ${totalScore}/${tool.maxScore} อยู่ในกลุ่มเฝ้าระวัง`);
        } else {
            riskLevel = "NORMAL";
            reasons.push(`คะแนนรวม ${totalScore}/${tool.maxScore} อยู่ในเกณฑ์ปกติ`);
        }
    }

    let fullReasoning = "";
    if (riskLevel === "PROBLEM") {
        fullReasoning = `จัดอยู่ใน 'กลุ่มมีปัญหา (PROBLEM)' เนื่องจาก: ${reasons.join(", ")}`;
    } else if (riskLevel === "RISK") {
        fullReasoning = `จัดอยู่ใน 'กลุ่มเสี่ยง (RISK)' เนื่องจาก: ${reasons.join(", ")}`;
    } else if (riskLevel === "WATCH") {
        fullReasoning = `จัดอยู่ใน 'กลุ่มเฝ้าระวัง (WATCH)' เนื่องจาก: ${reasons.join(", ")}`;
    } else {
        fullReasoning = `จัดอยู่ใน 'กลุ่มปกติ (NORMAL)' ผลการประเมินคะแนนรวม ${totalScore} คะแนน ไม่พบปัจจัยเสี่ยงที่มีนัยสำคัญ`;
    }

    return {
        score: totalScore,
        riskLevel: riskLevel,
        riskFactors: riskFactors,
        reasoning: fullReasoning
    };
}

// ============================================================================
// 3. ACTION REQUIRED AUTO-GENERATOR (STEP 07)
// ============================================================================

function autoGenerateActionRequired(student, screeningResult) {
    if (screeningResult.riskLevel !== "RISK" && screeningResult.riskLevel !== "PROBLEM") {
        return null;
    }

    const existing = actionRequiredList.find(a => 
        a.studentId === student.studentId && 
        a.screeningId === screeningResult.screeningId &&
        a.status !== "RESOLVED"
    );
    if (existing) return existing;

    const isProblem = screeningResult.riskLevel === "PROBLEM";
    const actionId = `ACT-2567-${String(actionRequiredList.length + 1).padStart(3, '0')}`;
    
    let actionType = "ติดตามนักเรียน";
    let title = "";
    let desc = "";
    let assignedRole = "ADVISOR";
    let assignedPerson = student.advisor || "ครูที่ปรึกษา";
    let priority = isProblem ? "CRITICAL" : "HIGH";

    const factors = screeningResult.riskFactors || [];

    if (factors.includes("SDQ_EMOTIONAL_PROBLEM") || factors.includes("SDQ_EMOTIONAL_CRITICAL")) {
        actionType = "ประเมินเพิ่มเติม";
        title = `ประเมินภาวะสุขภาพจิตเชิงลึก (2Q/9Q) สำหรับ ${student.name}`;
        desc = `ผลคัดกรองระบุคะแนนอารมณ์สูงในระดับวิกฤต จำเป็นต้องให้ครูแนะแนวร่วมทำแบบประเมินภาวะซึมเศร้า 2Q/9Q และพูดคุยรายบุคคล`;
        assignedRole = "COUNSELOR";
        assignedPerson = "ครูวิภา รักษ์เด็ก (ครูแนะแนว)";
    } else if (factors.includes("ATTENDANCE_CRITICAL") || factors.includes("CHRONIC_ABSENTEEISM")) {
        actionType = "ติดตามนักเรียน";
        title = `ลงพื้นที่เยี่ยมบ้านเพื่อติดตามการขาดเรียนต่อเนื่องของ ${student.name}`;
        desc = `สถิติการมาเรียนลดลงอย่างมีนัยสำคัญ (${student.attendanceRate}) จำเป็นต้องเยี่ยมบ้านเพื่อทำความเข้าใจบริบทครอบครัวและวางแผนช่วยเหลือก่อนหลุดออกจากระบบ`;
        assignedRole = "ADVISOR";
        assignedPerson = student.advisor;
    } else if (factors.includes("SDQ_PEER_HIGH") || factors.includes("SDQ_PEER_PROBLEM")) {
        actionType = "พูดคุยรายบุคคล";
        title = `พูดคุยรายบุคคลเพื่อพัฒนาสัมพันธภาพและลดความขัดแย้งของ ${student.name}`;
        desc = `คะแนนความสัมพันธ์กับเพื่อนบ่งชี้การแยกตัวและความตึงเครียดในห้องเรียน ครูที่ปรึกษาควรนัดหมายรับฟังและจัดกิจกรรมเพื่อนช่วยเพื่อน`;
        assignedRole = "ADVISOR";
        assignedPerson = student.advisor;
    } else {
        actionType = isProblem ? "ประเมินเพิ่มเติม" : "พูดคุยรายบุคคล";
        title = `วางแผนการดูแลช่วยเหลือเฉพาะบุคคล (${screeningResult.riskLevel}) สำหรับ ${student.name}`;
        desc = `เหตุผลประกอบการคัดกรอง: ${screeningResult.reasoning}`;
        assignedRole = isProblem ? "COUNSELOR" : "ADVISOR";
        assignedPerson = isProblem ? "ครูวิภา รักษ์เด็ก (ครูแนะแนว)" : student.advisor;
    }

    const newAction = {
        actionId: actionId,
        studentId: student.studentId,
        screeningId: screeningResult.screeningId,
        riskLevel: screeningResult.riskLevel,
        actionType: actionType,
        title: title,
        description: desc,
        assignedRole: assignedRole,
        assignedPerson: assignedPerson,
        priority: priority,
        dueDate: getFutureDateString(isProblem ? 7 : 14),
        status: "PENDING",
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        outcomeNotes: ""
    };

    actionRequiredList.unshift(newAction);
    return newAction;
}

function getFutureDateString(daysAhead) {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ============================================================================
// 4. ROLE-BASED ACCESS CONTROL PERMISSIONS (STEP 08)
// ============================================================================

function canUserAccessStudent(user, student) {
    if (!user || !student) return false;
    if (user.role === "COUNSELOR" || user.role === "EXECUTIVE" || user.role === "CARE_COMMITTEE") {
        return true;
    }
    if (user.role === "GRADE_HEAD") {
        return (student.grade === user.assignedGrade);
    }
    if (user.role === "ADVISOR") {
        return (student.grade === user.assignedGrade && student.class === user.assignedClass);
    }
    return false;
}

function canUserEditScreeningResult(user, session, student) {
    if (!user || !session || !student) return false;
    
    if (user.role === "EXECUTIVE") {
        return false;
    }

    if (session.status !== "IN_PROGRESS" && session.status !== "DRAFT") {
        return false;
    }

    if (user.role === "COUNSELOR") {
        return true;
    }

    if (user.role === "ADVISOR") {
        return (student.grade === user.assignedGrade && student.class === user.assignedClass);
    }

    return false;
}

function canUserTransitionSession(user, session, targetStatus) {
    if (!user || !session) return false;

    if (user.role === "COUNSELOR") {
        return true;
    }

    if (user.role === "ADVISOR") {
        if (session.grade === user.assignedGrade && session.class === user.assignedClass) {
            return (session.status === "IN_PROGRESS" && targetStatus === "SUBMITTED");
        }
        return false;
    }

    if (user.role === "EXECUTIVE") {
        return (session.status === "REVIEWED" && targetStatus === "COMPLETED");
    }

    return false;
}

// ============================================================================
// 5. DASHBOARD METRICS CALCULATION (STEP 05)
// ============================================================================

function getScreeningDashboardMetrics(scope = { grade: "ALL", class: "ALL" }, sessionId = null) {
    let accessibleStudents = students.filter(s => canUserAccessStudent(currentUser, s));

    if (scope.grade && scope.grade !== "ALL") {
        accessibleStudents = accessibleStudents.filter(s => s.grade === scope.grade);
    }
    if (scope.class && scope.class !== "ALL") {
        accessibleStudents = accessibleStudents.filter(s => s.class === scope.class);
    }

    const totalStudents = accessibleStudents.length;

    let targetResults = screeningResults;
    if (sessionId) {
        targetResults = targetResults.filter(r => r.screeningId === sessionId);
    }

    let normalCount = 0;
    let watchCount = 0;
    let riskCount = 0;
    let problemCount = 0;
    let screenedStudentIds = new Set();

    accessibleStudents.forEach(st => {
        const res = targetResults.find(r => r.studentId === st.studentId);
        if (res) {
            screenedStudentIds.add(st.studentId);
            if (res.riskLevel === "NORMAL") normalCount++;
            else if (res.riskLevel === "WATCH") watchCount++;
            else if (res.riskLevel === "RISK") riskCount++;
            else if (res.riskLevel === "PROBLEM") problemCount++;
        }
    });

    const screenedCount = screenedStudentIds.size;
    const unscreenedCount = Math.max(0, totalStudents - screenedCount);

    return {
        totalStudents,
        screenedCount,
        unscreenedCount,
        normalCount,
        watchCount,
        riskCount,
        problemCount,
        normalPct: totalStudents ? ((normalCount / totalStudents) * 100).toFixed(1) : 0,
        watchPct: totalStudents ? ((watchCount / totalStudents) * 100).toFixed(1) : 0,
        riskPct: totalStudents ? ((riskCount / totalStudents) * 100).toFixed(1) : 0,
        problemPct: totalStudents ? ((problemCount / totalStudents) * 100).toFixed(1) : 0,
        unscreenedPct: totalStudents ? ((unscreenedCount / totalStudents) * 100).toFixed(1) : 0
    };
}

// ============================================================================
// 6. STUDENT 360° INTEGRATION DATA AGGREGATOR (STEP 06)
// ============================================================================

function getStudent360Data(studentId) {
    const student = students.find(s => s.studentId === studentId);
    if (!student) return null;

    // STEP 05 — Development History for Student 360
    const devHistory = (typeof studentParticipations !== 'undefined' ? studentParticipations : [])
        .filter(p => p.studentId === studentId)
        .map(p => {
            const act = (typeof developmentActivities !== 'undefined' ? developmentActivities : []).find(a => a.activityId === p.activityId) || {};
            const prog = (typeof developmentPrograms !== 'undefined' ? developmentPrograms : []).find(pr => pr.programId === act.programId) || {};
            return {
                participationId: p.participationId,
                activityId: p.activityId,
                activityName: act.activityName || "กิจกรรมพัฒนา",
                programName: prog.programName || "โครงการส่งเสริม",
                programType: prog.type || "ทั่วไป",
                date: act.date || p.recordedAt,
                attendance: p.attendance,
                participation: p.participation,
                performance: p.performance,
                evaluation: p.evaluation,
                before: p.before,
                after: p.after,
                improvement: p.improvement,
                strength: p.strength,
                recommendation: p.recommendation,
                remark: p.remark,
                isStar: p.isStar
            };
        });

    const history = screeningResults
        .filter(r => r.studentId === studentId)
        .map(r => {
            const session = screeningSessions.find(s => s.screeningId === r.screeningId) || {};
            const tool = screeningTools.find(t => t.toolId === session.toolId) || {};
            return {
                resultId: r.resultId,
                screeningId: r.screeningId,
                academicYear: session.academicYear || 2567,
                semester: session.semester || 1,
                toolName: tool.toolName || "แบบประเมิน",
                score: r.score,
                subScores: r.subScores,
                category: r.category,
                riskLevel: r.riskLevel,
                riskFactors: r.riskFactors,
                reasoning: r.reasoning,
                recordedBy: r.recordedBy,
                recordedAt: r.recordedAt,
                evidenceNotes: r.evidenceNotes
            };
        })
        .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));

    const riskTrend = history.map(h => ({
        yearTerm: `${h.academicYear}/${h.semester}`,
        riskLevel: h.riskLevel,
        score: h.score,
        tool: h.toolName,
        date: h.recordedAt
    }));

    const activeActions = actionRequiredList.filter(a => a.studentId === studentId);

    // STEP 09 (MODULE 05) — Referral History for Student 360
    const refHistory = (typeof studentReferrals !== 'undefined' ? studentReferrals : [])
        .filter(r => r.studentId === studentId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
        student,
        screeningHistory: history,
        riskTrend: riskTrend,
        activeActions: activeActions,
        developmentHistory: devHistory,
        referralHistory: refHistory,
        currentRiskLevel: history.length > 0 ? history[0].riskLevel : "UNSCREENED",
        lastScreenedDate: history.length > 0 ? history[0].recordedAt : "ยังไม่เคยคัดกรอง"
    };
}

// ============================================================================
// 7. INPUT VALIDATIONS & TEST ENGINE (STEP 09)
// ============================================================================

function validateScreeningInput({ studentId, screeningId, score, subScores, teacherId }) {
    const errors = [];

    if (!studentId) errors.push("MISSING_STUDENT_ID: ต้องระบุรหัสนักเรียน");
    if (!screeningId) errors.push("MISSING_SCREENING_ID: ต้องระบุรหัสรอบการคัดกรอง");
    if (score === undefined || score === null || score === "") errors.push("MISSING_SCORE: ต้องระบุคะแนนผลการคัดกรอง");

    const session = screeningSessions.find(s => s.screeningId === screeningId);
    if (!session) {
        errors.push("INVALID_SESSION: ไม่พบข้อมูลรอบการคัดกรองที่ระบุ");
        return { isValid: false, errors };
    }

    const tool = screeningTools.find(t => t.toolId === session.toolId);
    const student = students.find(s => s.studentId === studentId);

    if (!student) {
        errors.push("INVALID_STUDENT: ไม่พบรหัสนักเรียนในระบบ");
        return { isValid: false, errors };
    }

    const numScore = parseFloat(score);
    if (isNaN(numScore) || numScore < tool.minScore || numScore > tool.maxScore) {
        errors.push(`SCORE_OUT_OF_RANGE: คะแนนที่ระบุ (${score}) ไม่อยู่ในช่วงที่ถูกต้อง (${tool.minScore} - ${tool.maxScore}) ของ ${tool.toolName}`);
    }

    const duplicate = screeningResults.find(r => r.studentId === studentId && r.screeningId === screeningId);
    if (duplicate) {
        errors.push(`DUPLICATE_STUDENT: นักเรียนรหัส ${studentId} (${student.name}) ได้รับการคัดกรองในรอบนี้ไปแล้ว (ResultID: ${duplicate.resultId})`);
    }

    const user = Object.values(USERS).find(u => u.id === teacherId) || currentUser;
    if (!canUserEditScreeningResult(user, session, student)) {
        errors.push(`PERMISSION_DENIED: ผู้ใช้ ${user.name} (${user.roleTitle}) ไม่มีสิทธิ์บันทึกหรือแก้ไขผลการคัดกรองสำหรับนักเรียนชั้น ${student.grade}/${student.class}`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

function validateSessionCreation({ academicYear, semester, grade, classRoom, toolId }) {
    const errors = [];
    if (!academicYear || !semester || !grade || !classRoom || !toolId) {
        errors.push("MISSING_SESSION_FIELDS: ต้องกรอกข้อมูลปีการศึกษา, เทอม, ชั้น, ห้อง, และเครื่องมือให้ครบถ้วน");
        return { isValid: false, errors };
    }

    const duplicate = screeningSessions.find(s => 
        s.academicYear == academicYear && 
        s.semester == semester && 
        s.grade === grade && 
        s.class === classRoom && 
        s.toolId === toolId &&
        s.status !== "COMPLETED"
    );

    if (duplicate) {
        errors.push(`DUPLICATE_SCREENING_SESSION: มีรอบการคัดกรอง ${grade}/${classRoom} เครื่องมือนี้อยู่ในปีการศึกษา ${academicYear} เทอม ${semester} แล้ว (สถานะ: ${duplicate.status})`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}



// ============================================================================
// 8. MODULE 03 — STUDENT DEVELOPMENT STORES & BUSINESS LOGIC
// ============================================================================

const PROGRAM_TYPES = {
    Homeroom: "กิจกรรมโฮมรูม",
    Guidance: "กิจกรรมแนะแนว",
    "Life Skills": "ทักษะชีวิต",
    Talent: "ส่งเสริมศักยภาพและความเป็นเลิศ",
    Academic: "ส่งเสริมวิชาการ",
    Behavior: "พัฒนาพฤติกรรมและวินัยเชิงบวก",
    Career: "แนะแนวอาชีพและการศึกษาต่อ",
    Other: "อื่นๆ"
};

// STEP 01 — Development Programs Store
let developmentPrograms = [
    {
        programId: "DEV-PROG-001",
        programName: "โครงการเสริมสร้างทักษะชีวิตและการจัดการความเครียดวัยรุ่น",
        type: "Life Skills",
        objective: "เพื่อเสริมสร้างความฉลาดทางอารมณ์ (EQ) และทักษะการเผชิญความเครียดอย่างสร้างสรรค์สำหรับนักเรียนทุกคน",
        targetGroup: "นักเรียนระดับชั้น ม.1 ทุกคน",
        responsiblePerson: "ครูวิภา รักษ์เด็ก (ครูแนะแนว)",
        startDate: "2024-05-20",
        endDate: "2024-07-31",
        status: "IN_PROGRESS"
    },
    {
        programId: "DEV-PROG-002",
        programName: "กิจกรรมโฮมรูมพัฒนาสัมพันธภาพและวินัยเชิงบวก",
        type: "Homeroom",
        objective: "สร้างความอบอุ่น ความผูกพันในห้องเรียน และการตั้งเป้าหมายชีวิตร่วมกัน",
        targetGroup: "นักเรียนชั้น ม.1/1",
        responsiblePerson: "ครูสมศรี มีสุข (ครูที่ปรึกษา)",
        startDate: "2024-05-18",
        endDate: "2024-09-30",
        status: "IN_PROGRESS"
    },
    {
        programId: "DEV-PROG-003",
        programName: "โครงการส่งเสริมอัจฉริยภาพและศักยภาพความเป็นเลิศทางวิชาการ",
        type: "Talent",
        objective: "ค้นหาและบ่มเพาะนักเรียนที่มีความสามารถพิเศษทางคณิตศาสตร์-วิทยาศาสตร์สู่เวทีแข่งขัน",
        targetGroup: "นักเรียนระดับชั้น ม.ต้น ที่มีความสามารถพิเศษ",
        responsiblePerson: "ครูมานพ ขยันยิ่ง (ครูวิชาการ)",
        startDate: "2024-06-01",
        endDate: "2024-08-31",
        status: "IN_PROGRESS"
    },
    {
        programId: "DEV-PROG-004",
        programName: "โครงการแนะแนวเส้นทางอาชีพและการค้นหาตนเอง (Career Discovery)",
        type: "Career",
        objective: "สำรวจความถนัด วางแผนการเรียนต่อและอาชีพในอนาคต",
        targetGroup: "นักเรียนชั้น ม.3 ทุกคน",
        responsiblePerson: "ครูวิภา รักษ์เด็ก (ครูแนะแนว)",
        startDate: "2024-07-01",
        endDate: "2024-09-15",
        status: "PLANNING"
    },
    {
        programId: "DEV-PROG-005",
        programName: "ค่ายพัฒนาพฤติกรรม ภาวะผู้นำ และจิตอาสาเพื่อสังคม",
        type: "Behavior",
        objective: "ฝึกฝนวินัย การทำงานเป็นทีม และจิตสาธารณะบำเพ็ญประโยชน์",
        targetGroup: "ตัวแทนนักเรียน ม.1 - ม.3",
        responsiblePerson: "ครูสมศรี มีสุข",
        startDate: "2024-05-10",
        endDate: "2024-05-12",
        status: "COMPLETED"
    }
];

// STEP 02 — Development Activities Store
let developmentActivities = [
    {
        activityId: "ACT-DEV-101",
        programId: "DEV-PROG-001",
        activityName: "Workshop: ทักษะการรู้เท่าทันอารมณ์และการจัดการความเครียด",
        date: "2024-06-05",
        location: "หอประชุมเฉลิมพระเกียรติ",
        responsible: "ครูวิภา รักษ์เด็ก (ครูแนะแนว)",
        description: "กิจกรรมกลุ่มย่อยฝึกเทคนิคการหายใจ การรู้เท่าทันอารมณ์โกรธ/เศร้า และการสื่อสารอย่างสันติ"
    },
    {
        activityId: "ACT-DEV-102",
        programId: "DEV-PROG-002",
        activityName: "กิจกรรมสานสัมพันธ์เพื่อนช่วยเพื่อนและกติกาห้องเรียนเชิงบวก",
        date: "2024-05-24",
        location: "ห้องเรียน ม.1/1",
        responsible: "ครูสมศรี มีสุข (ครูที่ปรึกษา)",
        description: "กิจกรรมโฮมรูมเปิดใจสร้างข้อตกลงร่วมกัน และจับคู่บัดดี้ช่วยเหลือการเรียน"
    },
    {
        activityId: "ACT-DEV-103",
        programId: "DEV-PROG-003",
        activityName: "ค่ายเข้มเสริมทักษะคิดวิเคราะห์และการแก้โจทย์คณิตศาสตร์ขั้นสูง",
        date: "2024-06-12",
        location: "ห้องปฏิบัติการคอมพิวเตอร์และคณิตศาสตร์",
        responsible: "ครูมานพ ขยันยิ่ง",
        description: "ฝึกฝนทักษะการคิดเชิงตรรกะและการจำลองโจทย์แข่งขันระดับชาติ"
    },
    {
        activityId: "ACT-DEV-104",
        programId: "DEV-PROG-001",
        activityName: "วงสนทนาพลังบวก (Peer Support Circle)",
        date: "2024-06-20",
        location: "ห้องแนะแนวและสุขภาวะจิต",
        responsible: "ครูวิภา รักษ์เด็ก",
        description: "เปิดพื้นที่ปลอดภัยให้นักเรียนแลกเปลี่ยนประสบการณ์การก้าวผ่านอุปสรรคและสร้างกำลังใจ"
    }
];

// STEP 03 & 04 — Student Participation & Development Outcomes Store
let studentParticipations = [
    {
        participationId: "PART-67-001",
        studentId: "STD-670104",
        activityId: "ACT-DEV-103",
        attendance: "PRESENT",
        participation: "HIGH",
        performance: "EXCELLENT",
        evaluation: "ดีเยี่ยม (10/10)",
        remark: "มีความกระตือรือร้นสูงมาก แก้โจทย์ได้อย่างรวดเร็วและอธิบายวิธีคิดให้เพื่อนในกลุ่มเข้าใจได้ดี",
        before: "มีความสนใจด้านคณิตศาสตร์แต่ยังไม่เคยผ่านการฝึกโจทย์ระดับแข่งขัน",
        after: "แก้โจทย์โอลิมปิกระดับ ม.ต้น ได้ถูกต้อง 90% และมีความมั่นใจสูง",
        improvement: "ทักษะการคิดเชิงนามธรรมและการให้เหตุผลทางคณิตศาสตร์พัฒนาอย่างก้าวกระโดด",
        strength: "อัจฉริยภาพด้านการคิดวิเคราะห์ มีความจำเชิงโครงสร้างยอดเยี่ยม และมีจิตอาสาช่วยเพื่อน",
        recommendation: "ส่งเสริมเข้าโครงการห้องเรียนพิเศษวิทยาศาสตร์-คณิตศาสตร์ และส่งแข่งขัน สอวน.",
        isStar: true,
        recordedBy: "ครูมานพ ขยันยิ่ง",
        recordedAt: "2024-06-12 16:30"
    },
    {
        participationId: "PART-67-002",
        studentId: "STD-670101",
        activityId: "ACT-DEV-101",
        attendance: "PRESENT",
        participation: "HIGH",
        performance: "GOOD",
        evaluation: "ดี (8.5/10)",
        remark: "เข้าร่วมกิจกรรมอย่างสดใส กล้าแสดงออก เป็นผู้นำกลุ่มสันทนาการ",
        before: "ค่อนข้างขี้อายและประหม่าเวลาพูดต่อหน้ากลุ่มใหญ่",
        after: "สามารถเป็นตัวแทนกลุ่มนำเสนอผลการสะท้อนความรู้สึกได้อย่างชัดเจน",
        improvement: "ความมั่นใจในตนเองและการสื่อสารต่อสาธารณะพัฒนาขึ้นอย่างชัดเจน",
        strength: "ทักษะมนุษยสัมพันธ์ดีเยี่ยม เข้ากับผู้อื่นได้ง่าย มีน้ำใจและทัศนคติเชิงบวก",
        recommendation: "ส่งเสริมให้ทำหน้าที่ประธานนักเรียนหรือแกนนำกิจกรรมจิตอาสา",
        isStar: true,
        recordedBy: "ครูวิภา รักษ์เด็ก",
        recordedAt: "2024-06-05 15:45"
    },
    {
        participationId: "PART-67-003",
        studentId: "STD-670105",
        activityId: "ACT-DEV-102",
        attendance: "PRESENT",
        participation: "MEDIUM",
        performance: "PASS",
        evaluation: "ผ่านเกณฑ์ (7/10)",
        remark: "มีสมาธิร่วมกิจกรรมดีขึ้นเมื่อมีเพื่อนบัดดี้คอยชวนคุย",
        before: "วอกแวกง่าย มักลุกเดินออกจากกลุ่ม",
        after: "สามารถนั่งร่วมกิจกรรมกลุ่มได้ตลอด 45 นาที และร่วมวาดภาพข้อตกลงห้องเรียน",
        improvement: "ช่วงความสนใจในการทำกิจกรรมร่วมกับเพื่อนพัฒนาขึ้น 50%",
        strength: "มีความคิดสร้างสรรค์และทักษะด้านงานประดิษฐ์และศิลปะเด่นชัด",
        recommendation: "ใช้กิจกรรมที่เน้นการลงมือปฏิบัติ (Hands-on) เพื่อดึงความสนใจและสร้างสมาธิ",
        isStar: false,
        recordedBy: "ครูสมศรี มีสุข",
        recordedAt: "2024-05-24 16:00"
    },
    {
        participationId: "PART-67-004",
        studentId: "STD-670102",
        activityId: "ACT-DEV-101",
        attendance: "PRESENT",
        participation: "LOW",
        performance: "NEEDS_IMPROVEMENT",
        evaluation: "ต้องพัฒนาเพิ่มเติม (4/10)",
        remark: "นั่งแยกตัว ไม่ยอมร่วมกลุ่มสนทนา มีสีหน้ากังวลและน้ำตาคลอระหว่างกิจกรรมสะท้อนความรู้สึก",
        before: "มีความวิตกกังวลสูงและแยกตัวจากกลุ่มเพื่อน",
        after: "ยังคงปฏิเสธการสื่อสารกับเพื่อนร่วมกลุ่มและไม่สามารถดำเนินกิจกรรมตามเป้าหมายได้",
        improvement: "ยังไม่พบพัฒนาการเชิงบวกในกิจกรรมกลุ่มขนาดใหญ่",
        strength: "มีความละเอียดรอบคอบในการทำงานเดี่ยว",
        recommendation: "จำเป็นต้องลดขนาดกลุ่มเป็นกิจกรรมเดี่ยว และให้ครูแนะแนวพูดคุยรายบุคคลเร่งด่วน",
        isStar: false,
        needsSupport: true,
        recordedBy: "ครูวิภา รักษ์เด็ก",
        recordedAt: "2024-06-05 15:50"
    },
    {
        participationId: "PART-67-005",
        studentId: "STD-670103",
        activityId: "ACT-DEV-101",
        attendance: "ABSENT",
        participation: "LOW",
        performance: "NEEDS_IMPROVEMENT",
        evaluation: "ขาดกิจกรรม (0/10)",
        remark: "ขาดเรียนในวันจัดกิจกรรม ไม่สามารถติดต่อผู้ปกครองได้",
        before: "ขาดเรียนบ่อยครั้งและมีปัญหาครอบครัว",
        after: "ไม่ได้รับการพัฒนาเนื่องจากไม่มาเข้าร่วม",
        improvement: "ไม่มี",
        strength: "มีทักษะทางด้านกีฬาฟุตบอล",
        recommendation: "ลงพื้นที่เยี่ยมบ้านด่วน และใช้กีฬาเป็นสะพานเชื่อมโยงนักเรียนกลับสู่โรงเรียน",
        isStar: false,
        needsSupport: true,
        recordedBy: "ครูวิภา รักษ์เด็ก",
        recordedAt: "2024-06-05 16:00"
    }
];

// STEP 06 — Development Dashboard Metrics
function getDevelopmentDashboardMetrics() {
    const totalStudents = students.length;
    const participatedSet = new Set(studentParticipations.filter(p => p.attendance === "PRESENT").map(p => p.studentId));
    const participatedCount = participatedSet.size;
    const nonParticipatedCount = Math.max(0, totalStudents - participatedCount);
    const totalActivities = developmentActivities.length;

    // Star Students (ค้นพบจุดเด่น/ศักยภาพสูง)
    const starStudents = studentParticipations
        .filter(p => p.isStar || p.performance === "EXCELLENT")
        .map(p => {
            const st = students.find(s => s.studentId === p.studentId) || {};
            const act = developmentActivities.find(a => a.activityId === p.activityId) || {};
            return {
                studentId: p.studentId,
                name: st.name,
                class: `${st.grade}/${st.class}`,
                activityName: act.activityName,
                strength: p.strength,
                recommendation: p.recommendation,
                avatar: st.avatar
            };
        });

    // Students needing further support (Performance ต่ำ / มีข้อสังเกต)
    const supportNeededStudents = studentParticipations
        .filter(p => p.needsSupport || p.performance === "NEEDS_IMPROVEMENT" || p.attendance === "ABSENT")
        .map(p => {
            const st = students.find(s => s.studentId === p.studentId) || {};
            const act = developmentActivities.find(a => a.activityId === p.activityId) || {};
            return {
                studentId: p.studentId,
                name: st.name,
                class: `${st.grade}/${st.class}`,
                activityId: p.activityId,
                activityName: act.activityName,
                attendance: p.attendance,
                remark: p.remark,
                recommendation: p.recommendation,
                avatar: st.avatar
            };
        });

    return {
        totalStudents,
        participatedCount,
        nonParticipatedCount,
        participatedPct: totalStudents ? ((participatedCount / totalStudents) * 100).toFixed(1) : 0,
        nonParticipatedPct: totalStudents ? ((nonParticipatedCount / totalStudents) * 100).toFixed(1) : 0,
        totalActivities,
        starStudents,
        supportNeededStudents
    };
}

// STEP 07 — Integration: 1-Click Create Case from Activity
function createCaseFromActivity(studentId, activityId, observationNotes, suggestedActionType = "พูดคุยรายบุคคล") {
    const student = students.find(s => s.studentId === studentId);
    if (!student) return null;

    const activity = developmentActivities.find(a => a.activityId === activityId) || { activityName: "กิจกรรมพัฒนาผู้เรียน" };

    const actionId = `ACT-2567-${String(actionRequiredList.length + 1).padStart(3, '0')}`;
    const newCase = {
        actionId: actionId,
        studentId: student.studentId,
        screeningId: "ACTIVITY-REFERRAL",
        riskLevel: "RISK",
        actionType: suggestedActionType,
        title: `ส่งต่อให้คำปรึกษา/ช่วยเหลือจากกิจกรรม: ${activity.activityName}`,
        description: `พบข้อสังเกตและปัญหาจากกิจกรรม '${activity.activityName}': ${observationNotes || "นักเรียนมีพฤติกรรมแยกตัวหรือต้องการการดูแลเป็นพิเศษ"}`,
        assignedRole: "COUNSELOR",
        assignedPerson: "ครูวิภา รักษ์เด็ก (ครูแนะแนว)",
        priority: "HIGH",
        dueDate: getFutureDateString(7),
        status: "PENDING",
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        outcomeNotes: ""
    };

    actionRequiredList.unshift(newCase);
    return newCase;
}


// STEP 03 & 04 — Record Student Participation & Development Outcome
function recordStudentParticipation({ studentId, activityId, attendance = "PRESENT", participation = "MEDIUM", performance = "GOOD", evaluation = "SATISFACTORY", remark = "", before = "", after = "", improvement = "", strength = "", recommendation = "" }) {
    const existingIdx = studentParticipations.findIndex(p => p.studentId === studentId && p.activityId === activityId);
    const participationId = existingIdx >= 0 ? studentParticipations[existingIdx].participationId : `PAR-DEV-${String(studentParticipations.length + 101)}`;
    const record = {
        participationId,
        studentId,
        activityId,
        attendance,
        participation,
        performance,
        evaluation,
        remark,
        before,
        after,
        improvement,
        strength,
        recommendation,
        recordedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    if (existingIdx >= 0) {
        studentParticipations[existingIdx] = record;
    } else {
        studentParticipations.push(record);
    }
    return record;
}


// ============================================================================
// MODULE 05 — REFERRAL MANAGEMENT (STEPS 01 - 09)
// ============================================================================

// STEP 03: Directory of External Partner Organizations
const EXTERNAL_ORGANIZATIONS = [
    {
        id: "EXT-HOSP-01",
        name: "โรงพยาบาลหรเทพ (แผนกจิตเวชเด็กและวัยรุ่น)",
        type: "HOSPITAL",
        category: "การแพทย์และสุขภาพจิต",
        contactPerson: "พญ. นภาพร จิตเวชการ (กุมารแพทย์ผู้เชี่ยวชาญ)",
        phone: "036-111-222 ต่อ 104",
        address: "123 ถ.สุขประชา อ.เมือง จ.สระบุรี"
    },
    {
        id: "EXT-SHELTER-01",
        name: "บ้านพักเด็กและครอบครัวจังหวัดสระบุรี (พมจ. สระบุรี)",
        type: "SOCIAL_WELFARE",
        category: "สวัสดิภาพสังคมและการคุ้มครองเด็ก",
        contactPerson: "นางสายใจ รักษ์สังคม (นักสังคมสงเคราะห์ชำนาญการ)",
        phone: "036-222-333 สายด่วน 1300",
        address: "45 หมู่ 2 ถ.มิตรภาพ จ.สระบุรี"
    },
    {
        id: "EXT-HEALTH-01",
        name: "ศูนย์บริการสาธารณสุขและสุขภาพจิตชุมชน เทศบาล",
        type: "HEALTH_CENTER",
        category: "สุขอนามัยและเวชกรรมป้องกัน",
        contactPerson: "นายแพทย์วิชาญ อนามัยดี",
        phone: "036-333-444",
        address: "88 ถ.เทศบาล 1 อ.เมือง จ.สระบุรี"
    },
    {
        id: "EXT-POLICE-01",
        name: "สถานีตำรวจภูธรเมืองสระบุรี (งานคุ้มครองเด็ก เยาวชนและสตรี)",
        type: "LAW_ENFORCEMENT",
        category: "ความปลอดภัยและกฎหมายเยาวชน",
        contactPerson: "พ.ต.ท. ประจักษ์ มั่นธรรม",
        phone: "036-444-555 หรือ 191",
        address: "10 ถ.พหลโยธิน จ.สระบุรี"
    }
];

// STEP 04: Standard Referral State Machine Stages
const REFERRAL_STATUSES = [
    "DRAFT",
    "SUBMITTED",
    "RECEIVED",
    "IN_PROGRESS",
    "FOLLOW_UP",
    "RESULT",
    "CLOSED",
    "REJECTED"
];

// STEP 01 - 03: Seeded Student Referrals Store
let studentReferrals = [
    {
        referralId: "REF-2567-001",
        studentId: "STD-670102",
        caseId: "ACT-2567-001",
        referralType: "INTERNAL",
        sender: {
            id: "T-0101",
            name: "ครูสมศรี มีสุข",
            role: "ADVISOR",
            department: "ระดับชั้น ม.1/1"
        },
        receiver: {
            id: "T-GUIDE",
            name: "ครูวิภา รักษ์เด็ก",
            role: "COUNSELOR",
            organization: "โรงเรียนหรเทพฯ",
            department: "งานแนะแนว",
            contact: "081-999-1111"
        },
        reason: "นักเรียนมีภาวะเครียด แยกตัวจากเพื่อน และคะแนนประเมิน SDQ ด้านเพื่อนและอารมณ์อยู่ในเกณฑ์เสี่ยงต่อเนื่อง ขอให้ครูแนะแนวช่วยประเมินเชิงลึกและให้คำปรึกษา",
        priority: "HIGH",
        date: "2024-05-28",
        status: "IN_PROGRESS",
        organization: "งานแนะแนว โรงเรียนหรเทพฯ",
        contact: "ครูวิภา รักษ์เด็ก (ห้องแนะแนว อาคาร 2)",
        requiredSupport: "การให้คำปรึกษาเชิงจิตวิทยารายบุคคลและการประเมิน 2Q/9Q เชิงลึก",
        parentConsentSigned: true,
        externalDocNumber: "ภายใน-แนะแนว-67/012",
        action: "นัดหมายพูดคุยรายบุคคล สังเกตพฤติกรรม และทำแบบคัดกรอง 2Q/9Q",
        result: "นักเรียนเริ่มผ่อนคลายและระบายปัญหาความขัดแย้งในกลุ่มเพื่อน ยังไม่พบสัญญาณซึมเศร้ารุนแรง",
        recommendation: "จัดกิจกรรมจับคู่เพื่อนสนิทในห้องเรียน และครูที่ปรึกษาช่วยสังเกตบรรยากาศในคาบโฮมรูม",
        nextStep: "นัดติดตามพูดคุยสัปดาห์ละ 1 ครั้ง",
        followUpDate: "2024-06-15",
        historyLog: [
            { timestamp: "2024-05-28 09:30", actor: "ครูสมศรี มีสุข", action: "SUBMITTED", notes: "ส่งต่อข้อมูลจากผลประเมิน SDQ" },
            { timestamp: "2024-05-28 14:00", actor: "ครูวิภา รักษ์เด็ก", action: "ACCEPTED", notes: "รับเรื่องส่งต่อ นัดพบนักเรียนในคาบแนะแนว" },
            { timestamp: "2024-05-30 11:30", actor: "ครูวิภา รักษ์เด็ก", action: "START_ACTION", notes: "ดำเนินการพูดคุยรอบแรก" }
        ]
    },
    {
        referralId: "REF-2567-002",
        studentId: "STD-670103",
        caseId: "ACT-2567-002",
        referralType: "EXTERNAL",
        sender: {
            id: "T-GUIDE",
            name: "ครูวิภา รักษ์เด็ก",
            role: "COUNSELOR",
            department: "งานแนะแนว"
        },
        receiver: {
            id: "EXT-HOSP-01",
            name: "พญ. นภาพร จิตเวชการ",
            role: "จิตแพทย์เด็กและวัยรุ่น",
            organization: "โรงพยาบาลหรเทพ (แผนกจิตเวชเด็กและวัยรุ่น)",
            department: "กลุ่มงานจิตเวชและสุขภาพจิต",
            contact: "036-111-222 ต่อ 104"
        },
        reason: "นักเรียนมีคะแนน SDQ รวม 25/40 (เกณฑ์มีปัญหาวิกฤต) พบอาการอารมณ์แปรปรวนรุนแรง และมีประวัติความเครียดในครอบครัว ขาดเรียนเรื้อรังเกิน 30%",
        priority: "CRITICAL",
        date: "2024-05-30",
        status: "RECEIVED",
        organization: "โรงพยาบาลหรเทพ (แผนกจิตเวชเด็กและวัยรุ่น)",
        contact: "พญ. นภาพร จิตเวชการ (036-111-222 ต่อ 104)",
        requiredSupport: "ขอรับการตรวจวินิจฉัยทางจิตเวชศาสตร์วัยรุ่น การประเมินภาวะสมาธิสั้น/ภาวะอารมณ์ และวางแผนการรักษาทางการแพทย์ร่วมกับโรงเรียน",
        parentConsentSigned: true,
        externalDocNumber: "ศธ 04225/ว.142",
        action: "โรงพยาบาลตอบรับการส่งตัว ออกใบนัดตรวจคลินิกจิตเวชวัยรุ่นเรียบร้อยแล้ว",
        result: "อยู่ระหว่างรอนัดตรวจครั้งแรก",
        recommendation: "จัดครูแนะแนวและผู้ปกครองพานักเรียนเข้ารับการตรวจตามนัด",
        nextStep: "พาเข้าตรวจตามใบนัดวันที่ 12 มิ.ย. 2567",
        followUpDate: "2024-06-12",
        historyLog: [
            { timestamp: "2024-05-30 10:15", actor: "ครูวิภา รักษ์เด็ก", action: "SUBMITTED", notes: "ออกหนังสือส่งตัวทางราชการ ศธ 04225/ว.142" },
            { timestamp: "2024-05-31 09:00", actor: "พญ. นภาพร จิตเวชการ", action: "ACCEPTED", notes: "ตอบรับเคส นัดหมายคลินิกจิตเวชเด็ก" }
        ]
    },
    {
        referralId: "REF-2567-003",
        studentId: "STD-670105",
        caseId: "ACT-DEV-101",
        referralType: "INTERNAL",
        sender: {
            id: "T-0101",
            name: "ครูสมศรี มีสุข",
            role: "ADVISOR",
            department: "ระดับชั้น ม.1/1"
        },
        receiver: {
            id: "T-CARE",
            name: "ครูธงชัย ใจมั่นคง",
            role: "CARE_COMMITTEE",
            organization: "โรงเรียนหรเทพฯ",
            department: "งานระบบดูแลช่วยเหลือนักเรียน",
            contact: "081-333-5555"
        },
        reason: "สถิติมาเรียนเริ่มลดลง และมีปัญหาไม่ทำงานส่งในวิชาคำนวณ ขอให้ฝ่ายระบบดูแลช่วยเหลือนักเรียนประสานอาจารย์ประจำวิชาเพื่อปรับแผนการเรียนและประเมินพฤติกรรม",
        priority: "NORMAL",
        date: "2024-06-02",
        status: "SUBMITTED",
        organization: "งานระบบดูแลช่วยเหลือนักเรียน",
        contact: "ครูธงชัย ใจมั่นคง (ห้องฝ่ายกิจการนักเรียน)",
        requiredSupport: "การประสานงานครูผู้สอนวิชาคำนวณเพื่อปรับแผนการบ้านและให้คำปรึกษาการปรับพฤติกรรม",
        parentConsentSigned: true,
        externalDocNumber: "ภายใน-ดูแล-67/005",
        action: "",
        result: "",
        recommendation: "",
        nextStep: "",
        followUpDate: "2024-06-16",
        historyLog: [
            { timestamp: "2024-06-02 11:20", actor: "ครูสมศรี มีสุข", action: "SUBMITTED", notes: "ส่งเรื่องให้งานระบบดูแลช่วยเหลือนักเรียน" }
        ]
    },
    {
        referralId: "REF-2567-004",
        studentId: "STD-670203",
        caseId: "ACT-2567-004",
        referralType: "EXTERNAL",
        sender: {
            id: "T-CARE",
            name: "ครูธงชัย ใจมั่นคง",
            role: "CARE_COMMITTEE",
            department: "งานระบบดูแลช่วยเหลือนักเรียน"
        },
        receiver: {
            id: "EXT-SHELTER-01",
            name: "นางสายใจ รักษ์สังคม",
            role: "นักสังคมสงเคราะห์ชำนาญการ",
            organization: "บ้านพักเด็กและครอบครัวจังหวัดสระบุรี",
            department: "กลุ่มคุ้มครองสวัสดิภาพเด็ก",
            contact: "036-222-333"
        },
        organization: "บ้านพักเด็กและครอบครัวจังหวัดสระบุรี",
        contact: "นางสายใจ รักษ์สังคม (036-222-333)",
        requiredSupport: "ขอรับเงินทุนสงเคราะห์ครอบครัวผู้มีรายได้น้อย การช่วยเหลือสิ่งของจำเป็น และการคุ้มครองสวัสดิภาพตาม พ.ร.บ. คุ้มครองเด็ก",
        parentConsentSigned: true,
        externalDocNumber: "ศธ 04225/ว.128",
        priority: "HIGH",
        date: "2024-05-15",
        status: "CLOSED",
        action: "เจ้าหน้าที่ พมจ. ร่วมกับครูลงพื้นที่เยี่ยมบ้านและอนุมัติเงินทุนการศึกษาฉุกเฉินจำนวน 5,000 บาท พร้อมจัดหาเครื่องอุปโภคบริโภค",
        result: "นักเรียนได้รับทุนสงเคราะห์เรียบร้อยแล้ว และสามารถกลับมาเข้าเรียนได้ตามปกติ",
        recommendation: "ให้ครูที่ปรึกษาติดตามการมาเรียนและการใช้จ่ายเงินทุนต่อเนื่องเดือนละ 1 ครั้ง",
        nextStep: "ปิดเคสส่งต่อการสงเคราะห์ระยะแรก ส่งต่อข้อมูลให้งานทุนการศึกษาโรงเรียนดูแลต่อเนื่อง",
        followUpDate: "2024-06-30",
        historyLog: [
            { timestamp: "2024-05-15 09:00", actor: "ครูธงชัย ใจมั่นคง", action: "SUBMITTED", notes: "ส่งหนังสือขอรับการสนับสนุนไปยัง พมจ." },
            { timestamp: "2024-05-16 10:30", actor: "นางสายใจ รักษ์สังคม", action: "ACCEPTED", notes: "รับเรื่องและกำหนดวันลงพื้นที่เยี่ยมบ้าน" },
            { timestamp: "2024-05-20 14:00", actor: "นางสายใจ รักษ์สังคม", action: "START_ACTION", notes: "ลงพื้นที่ร่วมกับโรงเรียน" },
            { timestamp: "2024-05-25 16:00", actor: "นางสายใจ รักษ์สังคม", action: "RESULT_SUBMITTED", notes: "อนุมัติทุนสงเคราะห์ 5,000 บาท" },
            { timestamp: "2024-05-26 10:00", actor: "ครูธงชัย ใจมั่นคง", action: "CLOSED", notes: "ตรวจสอบผลและปิดเคสการส่งต่อ" }
        ]
    },
    {
        referralId: "REF-2567-005",
        studentId: "STD-670202",
        caseId: "ACT-2567-005",
        referralType: "INTERNAL",
        sender: {
            id: "T-0201",
            name: "ครูมานพ ขยันยิ่ง",
            role: "ADVISOR",
            department: "ระดับชั้น ม.2/1"
        },
        receiver: {
            id: "T-GUIDE",
            name: "ครูวิภา รักษ์เด็ก",
            role: "COUNSELOR",
            organization: "โรงเรียนหรเทพฯ",
            department: "งานแนะแนว",
            contact: "081-999-1111"
        },
        reason: "มีภาวะความวิตกกังวลสูงเรื่องผลการเรียนและทะเลาะกับผู้ปกครองอย่างหนักเรื่องการเรียนต่อ",
        priority: "HIGH",
        date: "2024-05-20",
        status: "FOLLOW_UP",
        organization: "งานแนะแนว โรงเรียนหรเทพฯ",
        contact: "ครูวิภา รักษ์เด็ก",
        requiredSupport: "การให้คำปรึกษาครอบครัวและการสื่อสารเชิงบวก",
        parentConsentSigned: true,
        externalDocNumber: "ภายใน-แนะแนว-67/008",
        action: "เข้าพบครูแนะแนวเพื่อฝึกการจัดการความเครียดและการสื่อสารกับผู้ปกครอง",
        result: "นักเรียนมีสีหน้าแจ่มใสขึ้น แต่ยังคงต้องนัดพูดคุยติดตามผลอย่างต่อเนื่อง",
        recommendation: "นัดหมายผู้ปกครองมาร่วมพูดคุยปรับความเข้าใจ",
        nextStep: "ประชุมไตรภาคี (ครูแนะแนว + ผู้ปกครอง + นักเรียน)",
        followUpDate: "2024-05-28", // Overdue follow-up date relative to current date
        historyLog: [
            { timestamp: "2024-05-20 13:00", actor: "ครูมานพ ขยันยิ่ง", action: "SUBMITTED", notes: "ส่งต่อข้อมูลให้นักจิตวิทยาโรงเรียน" },
            { timestamp: "2024-05-21 09:30", actor: "ครูวิภา รักษ์เด็ก", action: "ACCEPTED", notes: "รับเรื่องส่งต่อ" },
            { timestamp: "2024-05-23 15:00", actor: "ครูวิภา รักษ์เด็ก", action: "START_ACTION", notes: "ให้คำปรึกษารอบแรก" },
            { timestamp: "2024-05-25 11:00", actor: "ครูวิภา รักษ์เด็ก", action: "FOLLOW_UP", notes: "นัดติดตามผลเพิ่มเติม (กำหนด 28 พ.ค.)" }
        ]
    }
];

// STEP 01 — Create New Student Referral
function createStudentReferral({
    studentId,
    caseId = "",
    referralType = "INTERNAL",
    sender = null,
    receiver = null,
    reason = "",
    priority = "NORMAL",
    requiredSupport = "",
    organization = "",
    contact = "",
    parentConsentSigned = true,
    externalDocNumber = ""
}) {
    const student = students.find(s => s.studentId === studentId);
    if (!student) {
        throw new Error("INVALID_STUDENT: ไม่พบรหัสนักเรียนในระบบ");
    }
    if (!reason || reason.trim().length === 0) {
        throw new Error("MISSING_REASON: ต้องระบุเหตุผลในการส่งต่อ");
    }

    const currentIdx = studentReferrals.length + 1;
    const referralId = `REF-2567-${String(currentIdx).padStart(3, '0')}`;
    const today = new Date().toISOString().substring(0, 10);

    const defaultSender = sender || {
        id: currentUser ? currentUser.id : "T-0101",
        name: currentUser ? currentUser.name : "ครูประจำชั้น",
        role: currentUser ? currentUser.role : "ADVISOR",
        department: currentUser ? (currentUser.assignedGrade || "ทั่วไป") : "ฝ่ายกิจการนักเรียน"
    };

    let defaultReceiver = receiver;
    if (!defaultReceiver) {
        if (referralType === "EXTERNAL") {
            const org = EXTERNAL_ORGANIZATIONS[0];
            defaultReceiver = {
                id: org.id,
                name: org.contactPerson,
                role: "ผู้ประสานงานภายนอก",
                organization: org.name,
                contact: org.phone
            };
        } else {
            defaultReceiver = {
                id: "T-GUIDE",
                name: "ครูวิภา รักษ์เด็ก",
                role: "COUNSELOR",
                organization: "โรงเรียนหรเทพฯ",
                department: "งานแนะแนว",
                contact: "081-999-1111"
            };
        }
    }

    const newReferral = {
        referralId,
        studentId,
        caseId: caseId || `ACT-REF-${currentIdx}`,
        referralType,
        sender: defaultSender,
        receiver: defaultReceiver,
        reason,
        priority,
        date: today,
        status: "SUBMITTED",
        organization: organization || (defaultReceiver.organization || ""),
        contact: contact || (defaultReceiver.contact || ""),
        requiredSupport: requiredSupport || "การดูแลช่วยเหลือตามกระบวนการส่งต่อ",
        parentConsentSigned: Boolean(parentConsentSigned),
        externalDocNumber: externalDocNumber || (referralType === "EXTERNAL" ? `ศธ 04225/ว.${100 + currentIdx}` : `ภายใน-ส่งต่อ-67/${String(currentIdx).padStart(3, '0')}`),
        action: "",
        result: "",
        recommendation: "",
        nextStep: "",
        followUpDate: getFutureDateString(14),
        historyLog: [
            {
                timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
                actor: defaultSender.name,
                action: "SUBMITTED",
                notes: reason
            }
        ]
    };

    studentReferrals.unshift(newReferral);
    return newReferral;
}

// STEP 05 — Receiver Action: Accept Referral
function acceptReferral(referralId, receiverNotes = "รับเรื่องการส่งต่อเรียบร้อยแล้ว") {
    const ref = studentReferrals.find(r => r.referralId === referralId);
    if (!ref) return null;

    ref.status = "RECEIVED";
    ref.historyLog.push({
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        actor: currentUser ? currentUser.name : (ref.receiver ? ref.receiver.name : "ผู้รับเรื่อง"),
        action: "ACCEPTED",
        notes: receiverNotes
    });
    return ref;
}

// STEP 05 — Receiver Action: Reject Referral
function rejectReferral(referralId, reason = "ปฏิเสธการส่งต่อเนื่องจากข้อมูลไม่ครบถ้วน") {
    const ref = studentReferrals.find(r => r.referralId === referralId);
    if (!ref) return null;

    ref.status = "REJECTED";
    ref.historyLog.push({
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        actor: currentUser ? currentUser.name : (ref.receiver ? ref.receiver.name : "ผู้รับเรื่อง"),
        action: "REJECTED",
        notes: reason
    });
    return ref;
}

// STEP 05 — Receiver Action: Request Information
function requestReferralInfo(referralId, inquiryText = "ขอข้อมูลพฤติกรรมและการเรียนเพิ่มเติม") {
    const ref = studentReferrals.find(r => r.referralId === referralId);
    if (!ref) return null;

    ref.historyLog.push({
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        actor: currentUser ? currentUser.name : (ref.receiver ? ref.receiver.name : "ผู้รับเรื่อง"),
        action: "REQUEST_INFO",
        notes: inquiryText
    });
    return ref;
}

// STEP 05 — Receiver Action: Start Action
function startReferralAction(referralId, planDetails = "เริ่มต้นขั้นตอนการดูแลและให้คำปรึกษา") {
    const ref = studentReferrals.find(r => r.referralId === referralId);
    if (!ref) return null;

    ref.status = "IN_PROGRESS";
    if (planDetails) ref.action = planDetails;
    ref.historyLog.push({
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        actor: currentUser ? currentUser.name : (ref.receiver ? ref.receiver.name : "ผู้รับเรื่อง"),
        action: "START_ACTION",
        notes: planDetails
    });
    return ref;
}

// STEP 05 & 06 — Receiver Action: Submit Result
function submitReferralResult(referralId, {
    action = "",
    result = "",
    recommendation = "",
    nextStep = "",
    followUpDate = "",
    closeCase = false
}) {
    const ref = studentReferrals.find(r => r.referralId === referralId);
    if (!ref) return null;

    if (action) ref.action = action;
    if (result) ref.result = result;
    if (recommendation) ref.recommendation = recommendation;
    if (nextStep) ref.nextStep = nextStep;
    if (followUpDate) ref.followUpDate = followUpDate;

    ref.status = closeCase ? "CLOSED" : (followUpDate ? "FOLLOW_UP" : "RESULT");
    ref.historyLog.push({
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        actor: currentUser ? currentUser.name : (ref.receiver ? ref.receiver.name : "ผู้รับเรื่อง"),
        action: closeCase ? "CLOSED" : "RESULT_SUBMITTED",
        notes: result || action
    });
    return ref;
}

// STEP 07 — Security & Privacy Sanitization for External Referrals
function getSanitizedExternalReferral(referralId) {
    const ref = studentReferrals.find(r => r.referralId === referralId);
    if (!ref) return null;

    const student = students.find(s => s.studentId === ref.studentId);
    if (!student) return null;

    // Masking Citizen ID (e.g. 1-1999-00234-56-2 -> 1-1999-XXXXX-XX-2)
    const rawNatId = student.nationalId || "";
    const maskedNatId = rawNatId.length >= 10
        ? rawNatId.substring(0, 7) + "-XXXXX-XX-" + rawNatId.slice(-1)
        : "1-XXXX-XXXXX-XX-X";

    return {
        referralId: ref.referralId,
        externalDocNumber: ref.externalDocNumber || "ศธ 04225/ว.พิเศษ",
        referralType: ref.referralType,
        date: ref.date,
        priority: ref.priority,
        status: ref.status,
        organization: ref.organization,
        contact: ref.contact,
        requiredSupport: ref.requiredSupport,
        reason: ref.reason,
        parentConsentSigned: ref.parentConsentSigned,
        sanitizedStudent: {
            studentId: student.studentId,
            name: student.name,
            nickname: student.nickname,
            grade: student.grade,
            class: student.class,
            number: student.number,
            maskedNationalId: maskedNatId,
            parentName: student.parentName,
            parentPhone: student.parentPhone
        },
        schoolAuthority: {
            schoolName: "โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)",
            director: "ดร.สมศักดิ์ รุ่งเรือง (ผู้อำนวยการโรงเรียน)",
            sealTitle: "หนังสือส่งตัวทางการเพื่อการคุ้มครองและดูแลช่วยเหลือนักเรียน"
        }
    };
}

// STEP 08 — Referral Dashboard Metrics Engine
function getReferralDashboardMetrics() {
    const today = new Date().toISOString().substring(0, 10);
    const total = studentReferrals.length;

    let waitingCount = 0;
    let receivedCount = 0;
    let inProgressCount = 0;
    let overdueCount = 0;
    let resultPendingCount = 0;
    let closedCount = 0;
    let internalCount = 0;
    let externalCount = 0;

    studentReferrals.forEach(r => {
        if (r.referralType === "INTERNAL") internalCount++;
        if (r.referralType === "EXTERNAL") externalCount++;

        if (r.status === "SUBMITTED") waitingCount++;
        else if (r.status === "RECEIVED") receivedCount++;
        else if (r.status === "IN_PROGRESS") inProgressCount++;
        else if (r.status === "FOLLOW_UP") resultPendingCount++;
        else if (r.status === "CLOSED") closedCount++;

        // Overdue check: followUpDate exists, is in the past, and case is not closed/rejected
        if (r.status !== "CLOSED" && r.status !== "REJECTED" && r.followUpDate && r.followUpDate < today) {
            overdueCount++;
        }
    });

    return {
        total,
        waitingCount,
        receivedCount,
        inProgressCount,
        overdueCount,
        resultPendingCount,
        closedCount,
        internalCount,
        externalCount
    };
}


if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        USERS,
        screeningTools,
        screeningSessions,
        students,
        screeningResults,
        actionRequiredList,
        classifyStudentRisk,
        autoGenerateActionRequired,
        canUserAccessStudent,
        canUserEditScreeningResult,
        canUserTransitionSession,
        getScreeningDashboardMetrics,
        getStudent360Data,
        validateScreeningInput,
        validateSessionCreation,
        PROGRAM_TYPES,
        developmentPrograms,
        developmentActivities,
        studentParticipations,
        getDevelopmentDashboardMetrics,
        createCaseFromActivity,
        recordStudentParticipation,
        EXTERNAL_ORGANIZATIONS,
        REFERRAL_STATUSES,
        studentReferrals,
        createStudentReferral,
        acceptReferral,
        rejectReferral,
        requestReferralInfo,
        startReferralAction,
        submitReferralResult,
        getSanitizedExternalReferral,
        getReferralDashboardMetrics
    };
}

