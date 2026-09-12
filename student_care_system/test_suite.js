/**
 * MODULE 02 — STEP 09 AUTOMATED TEST SUITE
 * ชุดทดสอบระบบการคัดกรองนักเรียนและจำแนกกลุ่มความเสี่ยง (7 ประเด็นหลัก)
 */

if (typeof require !== 'undefined') {
    var {
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
        validateScreeningInput,
        validateSessionCreation,
        PROGRAM_TYPES,
        developmentPrograms,
        developmentActivities,
        studentParticipations,
        getDevelopmentDashboardMetrics,
        getStudent360Data,
        createCaseFromActivity
    } = require('./app.js');
}

function runAllScreeningTests() {
    const results = [];

    function assertTest(id, name, passed, details) {
        results.push({ id, name, passed, details });
        const icon = passed ? "✓ PASS" : "✗ FAIL";
        console.log(`[${icon}] ${id}: ${name} -> ${details}`);
    }

    console.log("===============================================================");
    console.log("MODULE 02 — SCREENING: RUNNING 7 CORE AUTOMATED TESTS (STEP 09)");
    console.log("===============================================================\n");

    // -------------------------------------------------------------
    // TEST 1: คะแนนผิดช่วง (Score Range Validation)
    // -------------------------------------------------------------
    try {
        // SDQ max score is 40. Test score = 99 and score = -5
        const resOver = validateScreeningInput({
            studentId: "STD-670101",
            screeningId: "SCR-2567-T1-M1-1",
            score: 99,
            teacherId: "T-0101"
        });

        const resUnder = validateScreeningInput({
            studentId: "STD-670101",
            screeningId: "SCR-2567-T1-M1-1",
            score: -5,
            teacherId: "T-0101"
        });

        const hasOverError = resOver.errors.some(e => e.includes("SCORE_OUT_OF_RANGE"));
        const hasUnderError = resUnder.errors.some(e => e.includes("SCORE_OUT_OF_RANGE"));
        const passed1 = !resOver.isValid && hasOverError && !resUnder.isValid && hasUnderError;

        assertTest(
            "TEST-01",
            "คะแนนผิดช่วง (Score Range Validation)",
            passed1,
            "ระบบปฏิเสธคะแนน 99 และ -5 ที่เกินช่วง 0-40 ของเครื่องมือ SDQ อย่างถูกต้อง"
        );
    } catch (e) {
        assertTest("TEST-01", "คะแนนผิดช่วง (Score Range Validation)", false, e.message);
    }

    // -------------------------------------------------------------
    // TEST 2: นักเรียนซ้ำ (Duplicate Student Validation in Same Session)
    // -------------------------------------------------------------
    try {
        // STD-670101 already exists in SCR-2567-T1-M1-1
        const resDup = validateScreeningInput({
            studentId: "STD-670101",
            screeningId: "SCR-2567-T1-M1-1",
            score: 10,
            teacherId: "T-0101"
        });

        const hasDupError = resDup.errors.some(e => e.includes("DUPLICATE_STUDENT"));
        const passed2 = !resDup.isValid && hasDupError;

        assertTest(
            "TEST-02",
            "นักเรียนซ้ำ (Duplicate Student in Session)",
            passed2,
            "ตรวจจับและปฏิเสธการบันทึกผลซ้ำของนักเรียนรหัส STD-670101 ในรอบ SCR-2567-T1-M1-1 ได้สำเร็จ"
        );
    } catch (e) {
        assertTest("TEST-02", "นักเรียนซ้ำ (Duplicate Student in Session)", false, e.message);
    }

    // -------------------------------------------------------------
    // TEST 3: Screening ซ้ำ (Duplicate Session Validation)
    // -------------------------------------------------------------
    try {
        // Attempt creating duplicate active session for ม.1/1 in 2567 Term 1 with TOOL-SDQ-2567
        const resDupSession = validateSessionCreation({
            academicYear: 2567,
            semester: 1,
            grade: "ม.1",
            classRoom: "1/2", // 1/2 is currently REVIEWED (not COMPLETED)
            toolId: "TOOL-SDQ-2567"
        });

        const hasDupSessionError = resDupSession.errors.some(e => e.includes("DUPLICATE_SCREENING_SESSION"));
        const passed3 = !resDupSession.isValid && hasDupSessionError;

        assertTest(
            "TEST-03",
            "Screening ซ้ำ (Duplicate Session Validation)",
            passed3,
            "ระบบป้องกันการสร้างรอบคัดกรองซ้ำในระดับชั้น/ห้อง/เครื่องมือเดิมที่ยังไม่ปิดรอบ"
        );
    } catch (e) {
        assertTest("TEST-03", "Screening ซ้ำ (Duplicate Session Validation)", false, e.message);
    }

    // -------------------------------------------------------------
    // TEST 4: ไม่กรอกข้อมูล (Missing Fields Validation)
    // -------------------------------------------------------------
    try {
        const resMissing = validateScreeningInput({
            studentId: "",
            screeningId: "",
            score: null,
            teacherId: "T-0101"
        });

        const hasMissingStd = resMissing.errors.some(e => e.includes("MISSING_STUDENT_ID"));
        const hasMissingScr = resMissing.errors.some(e => e.includes("MISSING_SCREENING_ID"));
        const hasMissingScore = resMissing.errors.some(e => e.includes("MISSING_SCORE"));
        const passed4 = !resMissing.isValid && hasMissingStd && hasMissingScr && hasMissingScore;

        assertTest(
            "TEST-04",
            "ไม่กรอกข้อมูล (Missing Required Fields)",
            passed4,
            "ระบบตรวจจับและแจ้งเตือนเมื่อเว้นฟิลด์จำเป็น (StudentID, ScreeningID, Score)"
        );
    } catch (e) {
        assertTest("TEST-04", "ไม่กรอกข้อมูล (Missing Required Fields)", false, e.message);
    }

    // -------------------------------------------------------------
    // TEST 5: คำนวณผิด (Calculation & 4-Level Classification Test)
    // -------------------------------------------------------------
    try {
        // Test Normal
        const cNormal = classifyStudentRisk("TOOL-SDQ-2567", { emotional: 1, conduct: 1, hyperactivity: 1, peer: 1, prosocial: 8 }, "98%");
        // Test Watch
        const cWatch = classifyStudentRisk("TOOL-SDQ-2567", { emotional: 3, conduct: 3, hyperactivity: 5, peer: 3, prosocial: 6 }, "90%");
        // Test Risk
        const cRisk = classifyStudentRisk("TOOL-SDQ-2567", { emotional: 5, conduct: 3, hyperactivity: 4, peer: 5, prosocial: 5 }, "80%");
        // Test Problem
        const cProblem = classifyStudentRisk("TOOL-SDQ-2567", { emotional: 8, conduct: 7, hyperactivity: 6, peer: 4, prosocial: 3 }, "60%");

        const mathCorrect = (
            cNormal.score === 4 && cNormal.riskLevel === "NORMAL" &&
            cWatch.score === 14 && cWatch.riskLevel === "WATCH" &&
            cRisk.score === 17 && cRisk.riskLevel === "RISK" &&
            cProblem.score === 25 && cProblem.riskLevel === "PROBLEM" &&
            cProblem.reasoning.includes("จัดอยู่ใน 'กลุ่มมีปัญหา (PROBLEM)'") &&
            cProblem.reasoning.length > 50
        );

        assertTest(
            "TEST-05",
            "คำนวณผิด (Scoring & Reasoning Engine Accuracy)",
            mathCorrect,
            "การคำนวณคะแนนรวม การตัดเกณฑ์ 4 ระดับ (NORMAL, WATCH, RISK, PROBLEM) และการสร้างเหตุผลประกอบถูกต้อง 100%"
        );
    } catch (e) {
        assertTest("TEST-05", "คำนวณผิด (Scoring & Reasoning Engine Accuracy)", false, e.message);
    }

    // -------------------------------------------------------------
    // TEST 6: Permission ผิด (RBAC Access Violation Test)
    // -------------------------------------------------------------
    try {
        const studentM2 = students.find(s => s.grade === "ม.2" && s.class === "2/1");
        const sessionM2 = screeningSessions.find(s => s.grade === "ม.2" && s.class === "2/1");
        
        // Advisor of ม.1/1 attempts to edit ม.2/1
        const advisorM1 = USERS.ADVISOR_M1_1;
        const canAdvisorEditM2 = canUserEditScreeningResult(advisorM1, sessionM2, studentM2);

        // Executive attempts to edit raw score
        const exec = USERS.EXECUTIVE;
        const canExecEdit = canUserEditScreeningResult(exec, sessionM2, studentM2);

        // Counselor CAN edit M2
        const counselor = USERS.COUNSELOR;
        const canCounselorEdit = canUserEditScreeningResult(counselor, sessionM2, studentM2);

        const permCorrect = (!canAdvisorEditM2 && !canExecEdit && canCounselorEdit);

        assertTest(
            "TEST-06",
            "Permission ผิด (RBAC Enforcement Test)",
            permCorrect,
            "ครูประจำชั้น ม.1/1 ไม่สามารถบันทึก ม.2/1 ได้, ผู้บริหารไม่สามารถแก้คะแนนดิบได้, ครูแนะแนวมีสิทธิ์ระดับโรงเรียน"
        );
    } catch (e) {
        assertTest("TEST-06", "Permission ผิด (RBAC Enforcement Test)", false, e.message);
    }

    // -------------------------------------------------------------
    // TEST 7: Risk ไม่สร้าง Action Required (Auto-trigger Test)
    // -------------------------------------------------------------
    try {
        const testStudent = {
            studentId: "STD-TEST-99",
            name: "นักเรียนทดสอบ เสี่ยงสูง",
            advisor: "ครูสมศรี มีสุข",
            attendanceRate: "65%",
            grade: "ม.1",
            class: "1/1"
        };

        const testRiskResult = {
            screeningId: "SCR-TEST-SESSION",
            riskLevel: "RISK",
            riskFactors: ["SDQ_PEER_HIGH", "ATTENDANCE_DROP"],
            reasoning: "คะแนนด้านเพื่อนสูงและขาดเรียนบ่อย"
        };

        const testProblemResult = {
            screeningId: "SCR-TEST-SESSION-2",
            riskLevel: "PROBLEM",
            riskFactors: ["SDQ_EMOTIONAL_PROBLEM", "ATTENDANCE_CRITICAL"],
            reasoning: "คะแนนด้านอารมณ์วิกฤตและขาดเรียนเรื้อรัง"
        };

        const actionRisk = autoGenerateActionRequired(testStudent, testRiskResult);
        const actionProblem = autoGenerateActionRequired(testStudent, testProblemResult);

        const testNormalResult = {
            screeningId: "SCR-TEST-SESSION-3",
            riskLevel: "NORMAL",
            riskFactors: [],
            reasoning: "ปกติ"
        };
        const actionNormal = autoGenerateActionRequired(testStudent, testNormalResult);

        const triggerCorrect = (
            actionRisk !== null && actionRisk.status === "PENDING" && actionRisk.priority === "HIGH" &&
            actionProblem !== null && actionProblem.status === "PENDING" && actionProblem.priority === "CRITICAL" &&
            actionNormal === null // Normal should NOT create Action Required
        );

        assertTest(
            "TEST-07",
            "Risk ไม่สร้าง Action Required (Auto-trigger Validation)",
            triggerCorrect,
            "ยืนยันว่าทุกเคสที่เป็น RISK หรือ PROBLEM ระบบสร้าง Action Required ให้ผู้รับผิดชอบโดยอัตโนมัติ 100% (Normal ไม่สร้าง)"
        );
    } catch (e) {
        assertTest("TEST-07", "Risk ไม่สร้าง Action Required (Auto-trigger Validation)", false, e.message);
    }

    console.log("\n===============================================================");
    const passedCount = results.filter(r => r.passed).length;
    console.log(`TEST SUITE SUMMARY: ${passedCount}/${results.length} PASSED`);
    console.log("===============================================================");

    return {
        total: results.length,
        passed: passedCount,
        results
    };
}


function runAllDevelopmentTests() {
    const results = [];

    function assertTest(id, name, passed, details) {
        results.push({ id, name, passed, details });
        const icon = passed ? "✓ PASS" : "✗ FAIL";
        console.log(`[${icon}] ${id}: ${name} -> ${details}`);
    }

    console.log("\n===============================================================");
    console.log("MODULE 03 — STUDENT DEVELOPMENT: RUNNING 7 CORE TESTS (STEPS 01-07)");
    console.log("===============================================================\n");

    // -------------------------------------------------------------
    // DEV-TEST-01: Program Types Coverage (STEP 01)
    // -------------------------------------------------------------
    try {
        const requiredTypes = ["Homeroom", "Guidance", "Life Skills", "Talent", "Academic", "Behavior", "Career", "Other"];
        const existingTypes = Object.keys(PROGRAM_TYPES);
        const allTypesPresent = requiredTypes.every(t => existingTypes.includes(t));
        const programsValid = developmentPrograms.every(p => p.programId && p.programName && requiredTypes.includes(p.type) && p.status);

        assertTest(
            "DEV-TEST-01",
            "Development Program (8 Program Types Coverage)",
            allTypesPresent && programsValid,
            "รองรับประเภทโครงการครบทั้ง 8 หมวด (Homeroom, Guidance, Life Skills, Talent, Academic, Behavior, Career, Other) และโครงสร้าง ProgramID ครบถ้วน"
        );
    } catch (e) {
        assertTest("DEV-TEST-01", "Development Program Coverage", false, e.message);
    }

    // -------------------------------------------------------------
    // DEV-TEST-02: Activity Management & Linkage (STEP 02)
    // -------------------------------------------------------------
    try {
        const actValid = developmentActivities.length >= 3 && developmentActivities.every(a => {
            const hasProg = developmentPrograms.some(p => p.programId === a.programId);
            return a.activityId && a.activityName && a.date && a.location && a.responsible && hasProg;
        });

        assertTest(
            "DEV-TEST-02",
            "Activity Management & Program Linkage",
            actValid,
            "กิจกรรมพัฒนาผู้เรียนผูกกับ ProgramID ที่ถูกต้อง พร้อมระบุวัน เวลา สถานที่ และผู้รับผิดชอบชัดเจน"
        );
    } catch (e) {
        assertTest("DEV-TEST-02", "Activity Management & Linkage", false, e.message);
    }

    // -------------------------------------------------------------
    // DEV-TEST-03: Student Participation Tracking (STEP 03)
    // -------------------------------------------------------------
    try {
        const partValid = studentParticipations.length >= 4 && studentParticipations.every(p => 
            p.participationId && p.studentId && p.activityId && p.attendance && p.participation && p.performance
        );

        assertTest(
            "DEV-TEST-03",
            "Student Participation Tracking (Attendance & Performance)",
            partValid,
            "บันทึกข้อมูลการเข้าร่วม Attendance (Present/Absent), Participation (High/Med/Low) และ Performance ครบถ้วนรายบุคคล"
        );
    } catch (e) {
        assertTest("DEV-TEST-03", "Student Participation Tracking", false, e.message);
    }

    // -------------------------------------------------------------
    // DEV-TEST-04: Development Outcome Measurement (STEP 04)
    // -------------------------------------------------------------
    try {
        const outcomeValid = studentParticipations.some(p => 
            p.before && p.after && p.improvement && p.strength && p.recommendation
        );

        assertTest(
            "DEV-TEST-04",
            "Development Outcome (Before, After, Improvement, Strength)",
            outcomeValid,
            "ประเมินผลการพัฒนาแบบเปรียบเทียบ Before/After พัฒนาการที่เกิดขึ้น พร้อมระบุจุดเด่น (Strength) และข้อเสนอแนะต่อยอด"
        );
    } catch (e) {
        assertTest("DEV-TEST-04", "Development Outcome Measurement", false, e.message);
    }

    // -------------------------------------------------------------
    // DEV-TEST-05: Student 360° Integration (STEP 05)
    // -------------------------------------------------------------
    try {
        const s360Data = getStudent360Data("STD-670104");
        const hasDevHistory = s360Data && Array.isArray(s360Data.developmentHistory) && s360Data.developmentHistory.length > 0;
        const firstRecord = s360Data.developmentHistory[0];
        const detailComplete = firstRecord && firstRecord.activityName && firstRecord.strength && firstRecord.before && firstRecord.after;

        assertTest(
            "DEV-TEST-05",
            "Student 360° Development History Integration",
            hasDevHistory && detailComplete,
            "เมื่อเปิด Student 360° ของนักเรียน จะแสดง Timeline ประวัติการส่งเสริมและพัฒนา พร้อมจุดเด่นและคำแนะนำรายกิจกรรม"
        );
    } catch (e) {
        assertTest("DEV-TEST-05", "Student 360° Development History", false, e.message);
    }

    // -------------------------------------------------------------
    // DEV-TEST-06: Development Dashboard Metrics (STEP 06)
    // -------------------------------------------------------------
    try {
        const metrics = getDevelopmentDashboardMetrics();
        const metricsValid = (
            metrics.totalStudents > 0 &&
            metrics.participatedCount > 0 &&
            metrics.nonParticipatedCount >= 0 &&
            metrics.totalActivities > 0 &&
            Array.isArray(metrics.starStudents) && metrics.starStudents.length > 0 &&
            Array.isArray(metrics.supportNeededStudents) && metrics.supportNeededStudents.length > 0
        );

        assertTest(
            "DEV-TEST-06",
            "Development Dashboard Metrics & Dual Segmentation",
            metricsValid,
            "แสดงสรุปยอดเข้าร่วม, ไม่เข้าร่วม, กิจกรรมทั้งหมด พร้อมจำแนก 'นักเรียนเด่น (Star)' และ 'นักเรียนที่ต้องพัฒนาเพิ่ม' ได้ถูกต้อง"
        );
    } catch (e) {
        assertTest("DEV-TEST-06", "Development Dashboard Metrics", false, e.message);
    }

    // -------------------------------------------------------------
    // DEV-TEST-07: 1-Click Create Case Integration (STEP 07)
    // -------------------------------------------------------------
    try {
        const targetStdId = "STD-670102"; // กานดา สุวรรณรัตน์
        const targetActId = "ACT-DEV-101";
        const observation = "นักเรียนมีอาการซึมเศร้า แยกตัวจากกลุ่มระหว่างทำ Workshop";

        const newCase = createCaseFromActivity(targetStdId, targetActId, observation, "พูดคุยรายบุคคล");

        const caseValid = (
            newCase !== null &&
            newCase.studentId === targetStdId && // No re-typing required!
            newCase.title.includes("ส่งต่อให้คำปรึกษา/ช่วยเหลือจากกิจกรรม") &&
            newCase.description.includes(observation) &&
            newCase.status === "PENDING" &&
            newCase.priority === "HIGH"
        );

        assertTest(
            "DEV-TEST-07",
            "1-Click Create Case Integration (No StudentID Re-entry)",
            caseValid,
            "เมื่อพบปัญหาระหว่างกิจกรรม สามารถกด Create Case ส่งต่อช่วยเหลือได้ทันที โดยดึง StudentID และบริบทกิจกรรมมาใส่ให้อัตโนมัติ"
        );
    } catch (e) {
        assertTest("DEV-TEST-07", "1-Click Create Case Integration", false, e.message);
    }

    console.log("\n===============================================================");
    const passedCount = results.filter(r => r.passed).length;
    console.log(`MODULE 03 TEST SUMMARY: ${passedCount}/${results.length} PASSED`);
    console.log("===============================================================");

    return {
        total: results.length,
        passed: passedCount,
        results
    };
}

function runAllSystemTests() {
    const t2 = runAllScreeningTests();
    const t3 = runAllDevelopmentTests();
    return {
        total: t2.total + t3.total,
        passed: t2.passed + t3.passed,
        results: [...t2.results, ...t3.results]
    };
}


if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runAllScreeningTests, runAllDevelopmentTests, runAllSystemTests };
    if (require.main === module) {
        runAllSystemTests();
    }
}

