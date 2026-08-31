import os

html_content = """<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🏥 UAT Smoke Test Runner & Report Generator</title>

    <!-- Google Fonts & FontAwesome Icons -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <style>
        :root {
            --bg-primary: #0F172A;
            --bg-card: #1E293B;
            --bg-card-hover: #2E3E56;
            --border-color: #334155;
            --accent-color: #6366F1;
            --accent-hover: #4F46E5;
            --text-primary: #F8FAFC;
            --text-secondary: #94A3B8;
            --pass-color: #10B981;
            --pass-bg: rgba(16, 185, 129, 0.15);
            --fail-color: #EF4444;
            --fail-bg: rgba(239, 68, 68, 0.15);
            --block-color: #F59E0B;
            --block-bg: rgba(245, 158, 11, 0.15);
            --notrun-color: #64748B;
            --notrun-bg: rgba(100, 116, 139, 0.15);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Inter', 'Sarabun', sans-serif;
        }

        body {
            background-color: var(--bg-primary);
            color: var(--text-primary);
            padding: 24px;
            min-height: 100vh;
        }

        .container {
            max-width: 1300px;
            margin: 0 auto;
        }

        /* Header */
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--border-color);
        }

        .header-title h1 {
            font-size: 1.6rem;
            font-weight: 700;
            color: #FFFFFF;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .header-title p {
            color: var(--text-secondary);
            font-size: 0.9rem;
            margin-top: 4px;
        }

        .header-actions {
            display: flex;
            gap: 12px;
        }

        .btn {
            padding: 10px 18px;
            border-radius: 8px;
            font-size: 0.88rem;
            font-weight: 600;
            cursor: pointer;
            border: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
        }

        .btn-primary {
            background: var(--accent-color);
            color: white;
        }
        .btn-primary:hover {
            background: var(--accent-hover);
        }

        .btn-success {
            background: var(--pass-color);
            color: white;
        }
        .btn-success:hover {
            background: #059669;
        }

        .btn-secondary {
            background: #334155;
            color: var(--text-primary);
        }
        .btn-secondary:hover {
            background: #475569;
        }

        /* Dashboard Overview Grid */
        .dashboard-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 20px;
            margin-bottom: 24px;
        }

        .card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 20px;
        }

        .card-header {
            font-size: 1.05rem;
            font-weight: 600;
            color: #FFFFFF;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        /* Data Chain Form Grid */
        .datachain-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 14px;
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .form-group label {
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .form-group input {
            background: #0F172A;
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            padding: 9px 12px;
            border-radius: 6px;
            font-size: 0.9rem;
            outline: none;
            transition: border-color 0.2s;
        }

        .form-group input:focus {
            border-color: var(--accent-color);
        }

        /* Stats Card */
        .stats-container {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .stat-boxes {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            text-align: center;
        }

        .stat-box {
            padding: 12px 8px;
            border-radius: 8px;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid var(--border-color);
        }

        .stat-box .num {
            font-size: 1.4rem;
            font-weight: 700;
        }

        .stat-box .label {
            font-size: 0.75rem;
            color: var(--text-secondary);
            margin-top: 4px;
        }

        .progress-bar-container {
            margin-top: 8px;
        }

        .progress-info {
            display: flex;
            justify-content: space-between;
            font-size: 0.85rem;
            margin-bottom: 6px;
        }

        .progress-bar-bg {
            height: 10px;
            background: #0F172A;
            border-radius: 5px;
            overflow: hidden;
        }

        .progress-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #10B981, #34D399);
            width: 0%;
            transition: width 0.3s ease;
        }

        .gate-status {
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.82rem;
            font-weight: 600;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        .gate-ready { background: var(--pass-bg); color: var(--pass-color); border: 1px solid var(--pass-color); }
        .gate-notready { background: var(--fail-bg); color: var(--fail-color); border: 1px solid var(--fail-color); }

        /* Filter Controls */
        .controls-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            gap: 16px;
        }

        .filter-buttons {
            display: flex;
            gap: 8px;
        }

        .filter-btn {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            color: var(--text-secondary);
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 0.82rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }

        .filter-btn.active {
            background: var(--accent-color);
            color: white;
            border-color: var(--accent-color);
        }

        .search-box {
            position: relative;
            width: 300px;
        }

        .search-box input {
            width: 100%;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            padding: 8px 12px 8px 36px;
            border-radius: 8px;
            font-size: 0.88rem;
            outline: none;
        }

        .search-box i {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-secondary);
            font-size: 0.9rem;
        }

        /* Scenarios List */
        .scenarios-list {
            display: flex;
            flex-direction: column;
            gap: 14px;
        }

        .scenario-item {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 10px;
            padding: 16px;
            transition: border-color 0.2s;
        }

        .scenario-item:hover {
            border-color: #475569;
        }

        .scenario-item.passed { border-left: 4px solid var(--pass-color); }
        .scenario-item.failed { border-left: 4px solid var(--fail-color); }
        .scenario-item.blocked { border-left: 4px solid var(--block-color); }
        .scenario-item.notrun { border-left: 4px solid var(--notrun-color); }

        .scenario-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
        }

        .scenario-title-area {
            display: flex;
            align-items: flex-start;
            gap: 12px;
        }

        .flow-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
        }
        .flow-badge.opd { background: rgba(225, 29, 72, 0.2); color: #FB7185; }
        .flow-badge.ipd { background: rgba(14, 165, 233, 0.2); color: #38BDF8; }

        .sc-id {
            font-weight: 700;
            font-size: 0.95rem;
            color: #FFFFFF;
        }

        .sc-name {
            font-size: 0.95rem;
            font-weight: 500;
            color: var(--text-primary);
            margin-top: 2px;
        }

        .role-badge {
            display: inline-block;
            margin-top: 6px;
            font-size: 0.78rem;
            color: var(--text-secondary);
            background: rgba(255, 255, 255, 0.05);
            padding: 3px 8px;
            border-radius: 4px;
        }

        /* Action Status Buttons */
        .status-btn-group {
            display: flex;
            gap: 6px;
        }

        .status-btn {
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            border: 1px solid var(--border-color);
            background: #0F172A;
            color: var(--text-secondary);
            transition: all 0.15s ease;
        }

        .status-btn.btn-pass:hover, .status-btn.btn-pass.active {
            background: var(--pass-color); color: white; border-color: var(--pass-color);
        }

        .status-btn.btn-fail:hover, .status-btn.btn-fail.active {
            background: var(--fail-color); color: white; border-color: var(--fail-color);
        }

        .status-btn.btn-block:hover, .status-btn.btn-block.active {
            background: var(--block-color); color: white; border-color: var(--block-color);
        }

        .status-btn.btn-notrun:hover, .status-btn.btn-notrun.active {
            background: var(--notrun-color); color: white; border-color: var(--notrun-color);
        }

        /* Scenario Body Content */
        .scenario-details {
            margin-top: 14px;
            padding-top: 14px;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }

        .box-title {
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--text-secondary);
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .steps-content, .criteria-content {
            font-size: 0.85rem;
            color: #CBD5E1;
            line-height: 1.5;
            white-space: pre-line;
            background: rgba(15, 23, 42, 0.5);
            padding: 10px 12px;
            border-radius: 6px;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .notes-input-area {
            grid-column: span 2;
            margin-top: 6px;
        }

        .notes-input-area input {
            width: 100%;
            background: #0F172A;
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.85rem;
            outline: none;
        }

        .notes-input-area input:focus {
            border-color: var(--accent-color);
        }

        /* Modal styling for Linear Report Output */
        .modal-overlay {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.75);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease;
        }

        .modal-overlay.active {
            opacity: 1;
            pointer-events: auto;
        }

        .modal-box {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            width: 700px;
            max-width: 90%;
            padding: 24px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }

        .modal-header h3 {
            font-size: 1.1rem;
            color: white;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .close-modal {
            background: none; border: none; color: var(--text-secondary);
            font-size: 1.2rem; cursor: pointer;
        }

        .report-textarea {
            width: 100%;
            height: 320px;
            background: #0F172A;
            border: 1px solid var(--border-color);
            color: #38BDF8;
            font-family: 'Consolas', monospace;
            font-size: 0.85rem;
            padding: 12px;
            border-radius: 8px;
            outline: none;
            resize: none;
            margin-bottom: 16px;
        }

        .toast {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: var(--pass-color);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 600;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 8px;
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.3s ease;
            z-index: 2000;
        }

        .toast.show {
            transform: translateY(0);
            opacity: 1;
        }
    </style>
</head>
<body>

    <div class="container">
        <!-- Header -->
        <header>
            <div class="header-title">
                <h1><i class="fa-solid fa-notes-medical" style="color: #6366F1;"></i> UAT Smoke Test Runner & Report Generator</h1>
                <p>ระบบบันทึกผลการทดสอบความพร้อม (Smoke Test) E2E OPD to IPD (17 Scenarios) พร้อมออกรายงานสำหรับ Linear</p>
            </div>
            <div class="header-actions">
                <button class="btn btn-secondary" onclick="resetAllData()"><i class="fa-solid fa-rotate-right"></i> ล้างข้อมูล</button>
                <button class="btn btn-primary" onclick="exportLinearReport()"><i class="fa-solid fa-copy"></i> ออกรายงาน Linear</button>
            </div>
        </header>

        <!-- Dashboard Grid -->
        <div class="dashboard-grid">
            <!-- Data Chain Card -->
            <div class="card">
                <div class="card-header"><i class="fa-solid fa-link" style="color: #38BDF8;"></i> Data Chain Tracker (ข้อมูลสายสะสม)</div>
                <div class="datachain-grid">
                    <div class="form-group">
                        <label>Run ID</label>
                        <input type="text" id="meta-runid" value="SM-RUN-001" onchange="saveMetadata()">
                    </div>
                    <div class="form-group">
                        <label>Date Executed</label>
                        <input type="date" id="meta-date" onchange="saveMetadata()">
                    </div>
                    <div class="form-group">
                        <label>Tester Name</label>
                        <input type="text" id="meta-tester" placeholder="ชื่อผู้ทดสอบ..." onchange="saveMetadata()">
                    </div>
                    <div class="form-group">
                        <label>Environment</label>
                        <input type="text" id="meta-env" value="STAGING / UAT" onchange="saveMetadata()">
                    </div>
                    <div class="form-group">
                        <label>Primary HN</label>
                        <input type="text" id="meta-hn" placeholder="HN......" onchange="saveMetadata()">
                    </div>
                    <div class="form-group">
                        <label>Primary VN</label>
                        <input type="text" id="meta-vn" placeholder="VN......" onchange="saveMetadata()">
                    </div>
                    <div class="form-group">
                        <label>Primary AN</label>
                        <input type="text" id="meta-an" placeholder="AN......" onchange="saveMetadata()">
                    </div>
                    <div class="form-group">
                        <label>Bill No. / Inv</label>
                        <input type="text" id="meta-bill" placeholder="INV......" onchange="saveMetadata()">
                    </div>
                </div>
            </div>

            <!-- Metrics Card -->
            <div class="card stats-container">
                <div class="card-header"><i class="fa-solid fa-chart-pie" style="color: #10B981;"></i> ความคืบหน้า (Metrics)</div>
                <div class="stat-boxes">
                    <div class="stat-box">
                        <div class="num" style="color: var(--pass-color);" id="cnt-passed">0</div>
                        <div class="label">Passed</div>
                    </div>
                    <div class="stat-box">
                        <div class="num" style="color: var(--fail-color);" id="cnt-failed">0</div>
                        <div class="label">Failed</div>
                    </div>
                    <div class="stat-box">
                        <div class="num" style="color: var(--block-color);" id="cnt-blocked">0</div>
                        <div class="label">Blocked</div>
                    </div>
                    <div class="stat-box">
                        <div class="num" style="color: var(--notrun-color);" id="cnt-notrun">17</div>
                        <div class="label">Not Run</div>
                    </div>
                </div>

                <div class="progress-bar-container">
                    <div class="progress-info">
                        <span>Pass Rate</span>
                        <span id="pass-rate-text">0% (0/17)</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" id="progress-fill"></div>
                    </div>
                </div>

                <div id="gate-status-badge" class="gate-status gate-notready">
                    <i class="fa-solid fa-circle-xmark"></i> NOT READY FOR UAT
                </div>
            </div>
        </div>

        <!-- Controls Bar -->
        <div class="controls-bar">
            <div class="filter-buttons">
                <button class="filter-btn active" onclick="filterCategory('all', this)">ทั้งหมด (17)</button>
                <button class="filter-btn" onclick="filterCategory('OPD', this)">OPD Flow (4)</button>
                <button class="filter-btn" onclick="filterCategory('IPD', this)">IPD Flow (13)</button>
            </div>
            <div class="search-box">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="text" id="search-input" placeholder="ค้นหา Scenario ID, ชื่อบททดสอบ..." onkeyup="filterSearch()">
            </div>
        </div>

        <!-- Scenarios List -->
        <div class="scenarios-list" id="scenarios-container">
            <!-- Scenarios will be dynamically populated by JS -->
        </div>
    </div>

    <!-- Modal for Linear Report -->
    <div class="modal-overlay" id="report-modal">
        <div class="modal-box">
            <div class="modal-header">
                <h3><i class="fa-solid fa-code" style="color: #6366F1;"></i> Linear Report Summary (พร้อม Copy)</h3>
                <button class="close-modal" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <textarea class="report-textarea" id="report-output" readonly></textarea>
            <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button class="btn btn-secondary" onclick="closeModal()">ปิด</button>
                <button class="btn btn-success" onclick="copyReportToClipboard()"><i class="fa-solid fa-copy"></i> คัดลอกข้อความ</button>
            </div>
        </div>
    </div>

    <!-- Toast Notification -->
    <div class="toast" id="toast-msg">
        <i class="fa-solid fa-circle-check"></i> <span id="toast-text">คัดลอกรายงานเรียบร้อยแล้ว!</span>
    </div>

    <script>
        const scenariosData = [
            {
                id: "SC-01",
                flow: "OPD",
                name: "ลงทะเบียน คัดกรอง ก่อนเข้าตรวจ OPD",
                desc: "ผู้ป่วย Walk-in ลงทะเบียนแล้วถูกส่งต่อไปแผนกคัดกรอง และ เข้าคิว OPD",
                role: "เวชระเบียน / พยาบาลคัดกรอง / พยาบาล OPD",
                critical: true,
                steps: "1. ค้นหา/สร้าง HN -> ลงทะเบียน Visit -> พิมพ์ใบนำทาง\n2. พยาบาลคัดกรองดู tab 'คำขอ Walk-in' -> บันทึก Vital Sign -> เลือกแพทย์/นัด -> พิมพ์บัตรคิว\n3. คิวขึ้น tab 'รอเช็คอิน' -> กด Check-in -> กดเรียกคิว -> กด 'พร้อมตรวจ'",
                criteria: "สถานะผู้ป่วยเปลี่ยนเป็น 'กำลังดำเนินการ' และคิวแสดงหน้าห้องตรวจ"
            },
            {
                id: "SC-02 [A]",
                flow: "OPD",
                name: "แพทย์ตรวจ + วินิจฉัย + สั่ง Order (Lab/X-ray/ยา)",
                desc: "พยาบาลหน้าห้องตรวจกดเรียกคิว ตรวจผู้ป่วย OPD พร้อมกัน เพื่อเข้าห้องตรวจ แล้วสั่ง Order",
                role: "แพทย์ OPD / พยาบาลหน้าห้องตรวจ",
                critical: false,
                steps: "1. พยาบาลกดเรียกคิวเข้าห้องตรวจ\n2. แพทย์เปิด EMR เปลี่ยนสถานะ 'พร้อม' -> บันทึก Diagnosis (ICD-10)\n3. สั่ง Order ครบ 3 ชนิด (Lab + X-ray + ยา) ลงตะกร้า -> กด 'ส่งคำสั่ง' (Submit Order)",
                criteria: "ส่ง Order ทั้งหมดสำเร็จในครั้งเดียว และสถานะผู้ป่วยเปลี่ยนเป็น 'พักการตรวจ'"
            },
            {
                id: "SC-03",
                flow: "OPD",
                name: "ส่ง Lab/X-ray -> รับผล -> แพทย์อ่านผลต่อ",
                desc: "ระบบส่ง Order ไปห้อง Lab/X-ray และประมวลผล Lab/X-ray พร้อมแพทย์อ่านผลกลับเข้าตรวจต่อ",
                role: "จนท. Lab / แพทย์ OPD",
                critical: false,
                steps: "1. จนท. Lab เช็คอินรายการ -> เก็บตัวอย่าง (Container) -> ยืนยัน -> ลงผล Lab -> กด Final Report\n2. แพทย์เปิด EMR ดูผล -> เปลี่ยนสถานะ 'พร้อม' -> สั่งยาเพิ่ม/นัดหมาย/ออกใบรับรองแพทย์ -> กด 'ตรวจเสร็จ'",
                criteria: "ผล Lab ออกสมบูรณ์ และแพทย์เปลี่ยนสถานะผู้ป่วยเป็น 'ตรวจเสร็จ'"
            },
            {
                id: "SC-04",
                flow: "OPD",
                name: "เภสัชกรรม (สร้างใบยา) -> ชำระเงิน -> เภสัชกรรม จ่ายยา -> การเงินปิด Visit",
                desc: "เภสัชกรสร้างใบยาส่งต่อการเงินชำระเงินแล้วเภสัชกรจ่ายยาปิด Visit ให้ผู้ป่วย OPD",
                role: "เภสัชกร OPD / การเงิน",
                critical: false,
                steps: "1. เภสัชกรตรวจใบสั่งยา -> กด 'สร้างใบยา' -> กด 'ยืนยันใบยา' (ตัด Stock)\n2. การเงินออกใบแจ้งหนี้ -> รับชำระเงิน -> พิมพ์ใบเสร็จ -> กด 'เสร็จสิ้น'\n3. เภสัชกรเห็นสถานะ 'ชำระเงินแล้ว' -> พิมพ์ฉลากยา/จัดยา -> กด 'จ่ายยา' + เรียกคิว",
                criteria: "ตัด Stock ยาสำเร็จ ออกใบเสร็จเรียบร้อย และปิด Visit OPD สมบูรณ์"
            },
            {
                id: "SC-02 [B]",
                flow: "IPD",
                name: "แพทย์วินิจฉัยแล้วสั่ง Admit โดยไม่มี Order",
                desc: "แพทย์วินิจฉัยแล้วสั่ง Admit ผู้ป่วย OPD เข้า IPD ทันทีโดยไม่สั่ง Order",
                role: "แพทย์ OPD / พยาบาล",
                critical: false,
                steps: "1. พยาบาลเรียกคิว -> แพทย์เปิด EMR เปลี่ยนสถานะ 'พร้อม' -> ลงวินิจฉัย OPD Note\n2. แพทย์ประเมิน 'ต้อง Admit' -> กดปุ่ม 'สร้าง Admit Order' จาก EMR -> กรอกฟอร์ม -> Save",
                criteria: "สถานะผู้ป่วยเปลี่ยนเป็น 'รอ Admit' และคำขอส่งไปศูนย์จัดการเตียง"
            },
            {
                id: "SC-05",
                flow: "IPD",
                name: "จองเตียง -> สร้าง AN (ต่อเนื่องจาก Scenario 2 [B])",
                desc: "จนท.เตียงจองเตียงและสร้าง AN ให้ผู้ป่วย Admit",
                role: "จนท. ศูนย์จัดการเตียง",
                critical: true,
                steps: "1. เข้าเมนู ศูนย์จัดการเตียง -> tab 'คำขอ Admit' -> ค้นหาผู้ป่วย -> กด 'จองเตียง'\n2. เลือกวอร์ด/ประเภทเตียง/เตียง จากผังเตียง -> กดบันทึก\n3. กลับ tab 'คำขอ Admit' -> กดปุ่ม 'สร้าง AN'",
                criteria: "ระบบ Generate AN สำเร็จ ข้อมูลย้ายไปแสดงใน tab 'AN'"
            },
            {
                id: "SC-06",
                flow: "IPD",
                name: "ผู้ป่วยใน -> รายการเตียง หอผู้ป่วยใน",
                desc: "พยาบาล Ward เปิดรายการเตียงหอผู้ป่วยในและบันทึกเวลาผู้ป่วยมาถึงวอร์ด",
                role: "พยาบาล Ward",
                critical: false,
                steps: "1. เข้าเมนู ผู้ป่วยใน -> รายการเตียง -> เลือก Ward -> กด ส่ง\n2. ไปที่ tab 'เตียงทั้งหมด' -> เลือกผู้ป่วย -> กด 3 จุด -> เลือก 'บันทึกมาถึงวอร์ด' -> บันทึกเวลา",
                criteria: "บันทึกเวลาผู้ป่วยมาถึงวอร์ดสำเร็จ ผู้ป่วยแสดงสถานะพร้อมรับการดูแลบน Ward"
            },
            {
                id: "SC-07",
                flow: "IPD",
                name: "แพทย์ตรวจ + วินิจฉัย + สั่ง Order (Lab/X-ray/ยา)",
                desc: "แพทย์ Round ตรวจและสั่ง Order ยา/Lab/X-ray แบบ ONE DAY และ CONTINUE ให้ผู้ป่วย IPD",
                role: "แพทย์ IPD",
                critical: true,
                steps: "1. เปิด EMR IPD (ค้นด้วย AN) -> เข้าเมนู 'IPD Summary' -> บันทึก Progress Note\n2. เข้า tab 'Physician Order' -> สั่งออเดอร์ทั้ง 'One Day Order' และ 'Continue Order'\n3. กด บันทึก -> กดปุ่ม 'Sign All'",
                criteria: "Order แสดงใน tab IPD Summary แยกกลุ่ม One Day / Continue ชัดเจน Status = 'รอรับ'"
            },
            {
                id: "SC-08",
                flow: "IPD",
                name: "พยาบาลตรวจสอบ Order ยา และ Confirm รายการยา",
                desc: "พยาบาลตรวจสอบและ Confirm รายการยาผู้ป่วย IPD แพทย์สั่ง Order ทั้งแบบ ONE DAY และ CONTINUE",
                role: "พยาบาล Ward",
                critical: false,
                steps: "1. เข้าเมนู ผู้ป่วยใน -> รายการเตียง -> เลือก Ward -> เปิดหน้า 'Patient IPD Summary'\n2. ตรวจสอบคอลัมน์ 'ORDER FOR ONE DAY' และ 'NEW ORDER FOR CONTINUE'\n3. ตรวจสอบชื่อยา/ขนาด/วิธีใช้ -> กดปุ่ม 'รับออเดอร์' ทุกรายการ",
                criteria: "สถานะ Order เปลี่ยนเป็นรับออเดอร์แล้ว และรายการถูกส่งไปห้องยา IPD"
            },
            {
                id: "SC-09",
                flow: "IPD",
                name: "เภสัชกรรมจ่ายยา IPD [ONE DAY] (สร้างใบยา) -> ชำระเงิน -> เภสัชกรรม จ่ายยา -> พยาบาล Ward",
                desc: "เภสัชกรจ่ายยาผู้ป่วย IPD พร้อมกัน X ราย แยกตามประเภท Order ONE DAY และต้องชำระเงิน",
                role: "เภสัชกร IPD / การเงิน / พยาบาล Ward",
                critical: false,
                steps: "1. เภสัชกรเข้า tab 'Order รอยืนยัน' -> ตรวจสอบยา One Day -> กด 'สร้างใบยา' (พิมพ์ฉลาก auto) -> ยืนยันใบยา\n2. การเงินออกใบแจ้งหนี้ -> รับชำระเงิน\n3. เภสัชกรเห็นสถานะ 'ชำระเงินแล้ว' -> จัดยา -> กด 'จ่ายยา'",
                criteria: "รายการยา One Day วิ่งไปแสดงบน e-MAR ของพยาบาล Ward พร้อมจ่ายยา"
            },
            {
                id: "SC-10",
                flow: "IPD",
                name: "เภสัชกรรมจ่ายยา IPD [CONTINUE] (สร้างใบยา) -> เภสัชกรรม จ่ายยา -> พยาบาล Ward",
                desc: "เภสัชกรจ่ายยาผู้ป่วย IPD พร้อมกัน X ราย แยกตามประเภท CONTINUE โดยไม่รอการชำระเงิน",
                role: "เภสัชกร IPD / พยาบาล Ward",
                critical: false,
                steps: "1. เภสัชกรเข้าเมนู 'รับ Continue Order ประจำวัน' -> เลือก Ward -> กด ค้นหา\n2. กดปุ่ม 'Generate ที่เลือก' -> ระบบสร้างใบยา Continue\n3. พิมพ์ฉลากยา -> กด 'จ่ายยา' (ไม่ต้องรอชำระเงิน)",
                criteria: "รายการยา Continue ประจำวันถูก Generate และแสดงบน e-MAR ของ Ward ทันที"
            },
            {
                id: "SC-11",
                flow: "IPD",
                name: "จนท. Lab check-in + ลงผล + แพทย์อ่านผล",
                desc: "จนท. Lab ดำเนินการตรวจและบันทึกผลผู้ป่วย IPD ตามประเภท Order ONE DAY",
                role: "จนท. Lab / แพทย์ IPD",
                critical: false,
                steps: "1. จนท. Lab เข้า รายการแล็บ -> tab 'รอเช็คอิน' -> กด เช็คอิน -> เลือกประเภทตัวอย่าง -> กด เก็บแล้ว (Container) -> กด รับแล้ว\n2. ลงผล Lab -> บันทึกร่าง -> กด Final Report\n3. แพทย์เปิด Patient Profile IPD -> เมนู Lab result เพื่อดูผล",
                criteria: "สถานะ Lab Task = 'เสร็จสิ้น' (Result completed) และแพทย์เห็นผลในระบบ"
            },
            {
                id: "SC-12",
                flow: "IPD",
                name: "จนท. Xray check-in + ลงผล + แพทย์อ่านผล",
                desc: "จนท. Xray ดำเนินการตรวจและบันทึกผลผู้ป่วย IPD พร้อมกัน X ราย แยกตามประเภท Order ONE DAY",
                role: "จนท. X-ray / พยาบาล / แพทย์อ่านผล",
                critical: false,
                steps: "1. จนท. X-ray ไป tab 'รอ Check-in' -> เช็คอิน -> กด 'เริ่มถ่ายภาพ' -> กด 'ถ่ายภาพแล้ว' -> เลือกแพทย์อ่านผล\n2. พยาบาลลงบันทึก Nurse Note / Imaging Nurse Note\n3. แพทย์ลงรายงานผลตรวจรังสี -> กด บันทึก",
                criteria: "สถานะ Log = อ่านผล และรายงานผลรังสีแสดงใน EMR สมบูรณ์"
            },
            {
                id: "SC-13",
                flow: "IPD",
                name: "การเงินเรียกเก็บระหว่างพักรักษา (Interim Billing)",
                desc: "ญาติผู้ป่วยชำระค่ารักษาสะสมของผู้ป่วย IPD ทุก 3 วัน ตลอดช่วงพักรักษาในโรงพยาบาล",
                role: "การเงิน (Cashier IPD)",
                critical: false,
                steps: "1. เข้าเมนู Cashier ค้นหาผู้ป่วย IPD -> ดูรายการค่าใช้จ่ายสะสม (ยา/Lab/X-ray/ค่าห้อง)\n2. ตรวจสอบสิทธิ -> เลือกรายการค่าใช้จ่าย -> กด 'สร้างใบแจ้งหนี้' (Interim Bill)\n3. เลือกสิทธิ/วิธีชำระ -> กด จ่าย + ยืนยัน",
                criteria: "ระบบหักยอดชำระแล้วออกจากยอดค้างสะสม และตั้งรอบบันทึกใหม่สำหรับรอบถัดไป"
            },
            {
                id: "SC-14",
                flow: "IPD",
                name: "Discharge Process (ปิดยอดครั้งสุดท้าย)",
                desc: "แพทย์อนุมัติจำหน่ายผู้ป่วย IPD แล้วจนท.การเงินปิด Bill ยอดคงเหลือทั้งหมดและปลดเตียงคืนระบบ",
                role: "แพทย์ IPD / การเงิน IPD",
                critical: true,
                steps: "1. แพทย์บันทึก Discharge Summary + ลงวินิจฉัยสุดท้าย + สั่งยากลับบ้าน -> กด ยืนยัน Discharge\n2. การเงินเปิดรายการ IPD รอปิด Bill -> ออกใบแจ้งหนี้ยอดสุดท้าย -> กด จ่าย + ยืนยัน -> ออกใบเสร็จ\n3. การเงินกดปุ่ม 'ปิด Admission'",
                criteria: "รายชื่อผู้ป่วยย้ายไป tab 'ผู้ป่วยจำหน่าย' (Status = เสร็จสิ้น) และปลดเตียงคืนระบบสำเร็จ"
            },
            {
                id: "SC-15",
                flow: "IPD",
                name: "จนท. จากทุกแผนกเข้าสั่งพิมพ์ report จากเมนู รายงาน",
                desc: "เจ้าหน้าที่แต่ละแผนกละคน เข้ามาออกรายงานที่เมนูออกรายงาน",
                role: "จนท. ทุกแผนก",
                critical: false,
                steps: "1. เข้าเมนู รายงาน (Report) -> เลือกประเภทรายงานตามแผนก\n2. ทดสอบกด สั่งพิมพ์ (Print) สรุปยอด\n3. ทดสอบกด ดาวน์โหลด (Download) สรุปยอด",
                criteria: "สั่งออกรายงานได้สำเร็จ ข้อมูลในไฟล์ PDF/Excel ถูกต้องครบถ้วน"
            },
            {
                id: "SC-16",
                flow: "IPD",
                name: "จนท. Coder เข้าเมนู เบิกจ่าย เพื่อลงรหัสโรค",
                desc: "เจ้าหน้าที่แผนก Coder เข้ามาลงรหัสโรคของผู้ป่วย",
                role: "จนท. Coder",
                critical: false,
                steps: "1. เข้าเมนู เบิกจ่าย -> OPD/IPD -> รายการรอรหัสโรค -> เลือกผู้ป่วยสถานะ 'รอลงรหัส'\n2. ไปที่ Patient Profile -> เลือก Diagnosis + Procedure -> กด บันทึก\n3. กดปุ่ม '>' เพื่อลงรหัสคนถัดไป",
                criteria: "สถานะผู้ป่วยเปลี่ยนเป็น 'ลงรหัสแล้ว' และย้ายไปแสดงใน tab ลงรหัสแล้ว"
            }
        ];

        let testState = {};
        let currentCategory = 'all';

        document.addEventListener('DOMContentLoaded', () => {
            // Set default date to today
            document.getElementById('meta-date').valueAsDate = new Date();
            loadState();
            renderScenarios();
            updateMetrics();
        });

        function loadState() {
            const saved = localStorage.getItem('uat_smoke_test_state');
            if (saved) {
                try {
                    testState = JSON.parse(saved);
                    // Load metadata
                    if (testState.metadata) {
                        for (let k in testState.metadata) {
                            let el = document.getElementById('meta-' + k);
                            if (el) el.value = testState.metadata[k];
                        }
                    }
                } catch(e) { console.error('Failed to parse saved state'); }
            }
        }

        function saveState() {
            localStorage.setItem('uat_smoke_test_state', JSON.stringify(testState));
            updateMetrics();
        }

        function saveMetadata() {
            if (!testState.metadata) testState.metadata = {};
            ['runid', 'date', 'tester', 'env', 'hn', 'vn', 'an', 'bill'].forEach(k => {
                let el = document.getElementById('meta-' + k);
                if (el) testState.metadata[k] = el.value;
            });
            saveState();
        }

        function setStatus(scId, status) {
            if (!testState.scenarios) testState.scenarios = {};
            if (!testState.scenarios[scId]) testState.scenarios[scId] = {};
            testState.scenarios[scId].status = status;
            
            // Update UI item border
            let item = document.getElementById('item-' + scId);
            if (item) {
                item.className = 'scenario-item ' + status.toLowerCase();
            }

            // Update buttons
            let btns = document.querySelectorAll(`#item-${scId.replace(/[^a-zA-Z0-9]/g, '')} .status-btn`);
            btns.forEach(b => {
                if (b.getAttribute('data-status') === status) b.classList.add('active');
                else b.classList.remove('active');
            });

            saveState();
        }

        function setNotes(scId, val) {
            if (!testState.scenarios) testState.scenarios = {};
            if (!testState.scenarios[scId]) testState.scenarios[scId] = {};
            testState.scenarios[scId].notes = val;
            saveState();
        }

        function renderScenarios() {
            const container = document.getElementById('scenarios-container');
            container.innerHTML = '';

            scenariosData.forEach(sc => {
                let stateObj = (testState.scenarios && testState.scenarios[sc.id]) ? testState.scenarios[sc.id] : { status: 'notrun', notes: '' };
                let st = stateObj.status || 'notrun';
                let notesVal = stateObj.notes || '';

                let cleanId = sc.id.replace(/[^a-zA-Z0-9]/g, '');

                let div = document.createElement('div');
                div.className = `scenario-item ${st.toLowerCase()}`;
                div.id = `item-${sc.id}`;
                div.setAttribute('data-flow', sc.flow);
                div.setAttribute('data-id', sc.id);

                div.innerHTML = `
                    <div class="scenario-header">
                        <div class="scenario-title-area">
                            <span class="flow-badge ${sc.flow.toLowerCase()}">${sc.flow}</span>
                            <div>
                                <div class="sc-id">${sc.id} ${sc.critical ? '<span style="color:#EF4444;" title="Critical Scenario">*</span>' : ''}</div>
                                <div class="sc-name">${sc.name}</div>
                                <div class="role-badge"><i class="fa-solid fa-user-gear"></i> ${sc.role}</div>
                            </div>
                        </div>

                        <div class="status-btn-group" id="item-${cleanId}">
                            <button class="status-btn btn-pass ${st === 'passed' ? 'active' : ''}" data-status="passed" onclick="setStatus('${sc.id}', 'passed')">🟢 Pass</button>
                            <button class="status-btn btn-fail ${st === 'failed' ? 'active' : ''}" data-status="failed" onclick="setStatus('${sc.id}', 'failed')">🔴 Fail</button>
                            <button class="status-btn btn-block ${st === 'blocked' ? 'active' : ''}" data-status="blocked" onclick="setStatus('${sc.id}', 'blocked')">🟡 Block</button>
                            <button class="status-btn btn-notrun ${st === 'notrun' ? 'active' : ''}" data-status="notrun" onclick="setStatus('${sc.id}', 'notrun')">⚪ Not Run</button>
                        </div>
                    </div>

                    <div class="scenario-details">
                        <div>
                            <div class="box-title"><i class="fa-solid fa-list-check" style="color:#6366F1;"></i> ขั้นตอนทดสอบย่อ (Quick Steps)</div>
                            <div class="steps-content">${sc.steps}</div>
                        </div>
                        <div>
                            <div class="box-title"><i class="fa-solid fa-bullseye" style="color:#10B981;"></i> เกณฑ์การผ่าน (Expected Pass Criteria)</div>
                            <div class="criteria-content">${sc.criteria}</div>
                        </div>
                        <div class="notes-input-area">
                            <input type="text" placeholder="หมายเหตุ / เลข Bug ID (ถ้ามี)..." value="${notesVal}" onchange="setNotes('${sc.id}', this.value)">
                        </div>
                    </div>
                `;

                container.appendChild(div);
            });
        }

        function updateMetrics() {
            let p = 0, f = 0, b = 0, nr = 0;
            scenariosData.forEach(sc => {
                let st = (testState.scenarios && testState.scenarios[sc.id]) ? testState.scenarios[sc.id].status : 'notrun';
                if (st === 'passed') p++;
                else if (st === 'failed') f++;
                else if (st === 'blocked') b++;
                else nr++;
            });

            document.getElementById('cnt-passed').innerText = p;
            document.getElementById('cnt-failed').innerText = f;
            document.getElementById('cnt-blocked').innerText = b;
            document.getElementById('cnt-notrun').innerText = nr;

            let rate = Math.round((p / 17) * 100);
            document.getElementById('pass-rate-text').innerText = `${rate}% (${p}/17)`;
            document.getElementById('progress-fill').style.width = rate + '%';

            // Gate status check (Criticals SC-01, SC-05, SC-07, SC-14 must pass)
            let criticals = ['SC-01', 'SC-05', 'SC-07', 'SC-14'];
            let critPass = criticals.every(id => (testState.scenarios && testState.scenarios[id] && testState.scenarios[id].status === 'passed'));

            let badge = document.getElementById('gate-status-badge');
            if (critPass && f === 0 && b === 0) {
                badge.className = "gate-status gate-ready";
                badge.innerHTML = `<i class="fa-solid fa-circle-check"></i> READY FOR UAT (Passed Criticals)`;
            } else {
                badge.className = "gate-status gate-notready";
                badge.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> NOT READY FOR UAT`;
            }
        }

        function filterCategory(cat, btn) {
            currentCategory = cat;
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            filterSearch();
        }

        function filterSearch() {
            let q = document.getElementById('search-input').value.toLowerCase();
            let items = document.querySelectorAll('.scenario-item');

            items.forEach(item => {
                let flow = item.getAttribute('data-flow');
                let scId = item.getAttribute('data-id').toLowerCase();
                let text = item.innerText.toLowerCase();

                let matchCat = (currentCategory === 'all') || (flow === currentCategory);
                let matchSearch = (scId.includes(q) || text.includes(q));

                if (matchCat && matchSearch) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        }

        function resetAllData() {
            if (confirm('คุณต้องการล้างข้อมูลการทดสอบทั้งหมดหรือไม่?')) {
                localStorage.removeItem('uat_smoke_test_state');
                testState = {};
                renderScenarios();
                updateMetrics();
                showToast('ล้างข้อมูลเรียบร้อยแล้ว!');
            }
        }

        function exportLinearReport() {
            let m = testState.metadata || {};
            let runid = m.runid || 'SM-RUN-001';
            let date = m.date || new Date().toISOString().split('T')[0];
            let tester = m.tester || '[ยังไม่ได้ระบุชื่อ]';
            let env = m.env || 'STAGING / UAT';

            let p = 0, f = 0, b = 0, nr = 0;
            let failedList = [];
            scenariosData.forEach(sc => {
                let stateObj = (testState.scenarios && testState.scenarios[sc.id]) ? testState.scenarios[sc.id] : { status: 'notrun', notes: '' };
                let st = stateObj.status || 'notrun';
                if (st === 'passed') p++;
                else if (st === 'failed') { f++; failedList.push(`${sc.id} ${sc.name} (Note: ${stateObj.notes || 'N/A'})`); }
                else if (st === 'blocked') { b++; failedList.push(`${sc.id} ${sc.name} [BLOCKED] (Note: ${stateObj.notes || 'N/A'})`); }
                else nr++;
            });

            let rate = Math.round((p / 17) * 100);
            let criticals = ['SC-01', 'SC-05', 'SC-07', 'SC-14'];
            let critPass = criticals.every(id => (testState.scenarios && testState.scenarios[id] && testState.scenarios[id].status === 'passed'));
            let readyText = (critPass && f === 0 && b === 0) ? `🟢 READY FOR UAT (Pass Rate: ${rate}%)` : `🔴 NOT READY FOR UAT (Pass Rate: ${rate}%)`;

            let text = `📢 **[Smoke Test Summary Report] - Pre-UAT Verification Sign-off**\n`;
            text += `🗓 Date: ${date} | Environment: ${env} | Run ID: ${runid}\n`;
            text += `👤 Tester: ${tester}\n\n`;
            text += `📊 Overall Status: ${readyText}\n\n`;
            text += `• Total Scenarios: 17 Scenarios\n`;
            text += `• 🟢 Passed: ${p} Scenarios\n`;
            text += `• 🔴 Failed: ${f} Scenarios\n`;
            text += `• 🟡 Blocked: ${b} Scenarios\n`;
            text += `• ⚪ Not Run: ${nr} Scenarios\n\n`;
            text += `🔗 Primary E2E Data Chain Tracked:\n`;
            text += `• HN: ${m.hn || '-'}  |  VN: ${m.vn || '-'}  |  AN: ${m.an || '-'}  |  Bill No: ${m.bill || '-'}\n\n`;

            if (failedList.length > 0) {
                text += `⚠️ Open Defect / Failed Items:\n`;
                failedList.forEach(item => { text += `• ${item}\n`; });
                text += `\n`;
            } else {
                text += `✨ No Defect Found during Smoke Testing.\n\n`;
            }

            text += `✅ Recommendation / Sign-off:\n`;
            text += (critPass && f === 0 && b === 0)
                ? `ระบบผ่านการตรวจความพร้อมหลักครบถ้วน อนุมัติเปิดให้ผู้ใช้งานทดสอบรอบ UAT ได้ตามกำหนดการ`
                : `ระบบยังมีข้อบกพร่องใน Scenario สำคัญ โปรดแก้ไข Bug ก่อนเริ่มรอบ UAT`;

            document.getElementById('report-output').value = text;
            document.getElementById('report-modal').classList.add('active');
        }

        function closeModal() {
            document.getElementById('report-modal').classList.remove('active');
        }

        function copyReportToClipboard() {
            let textarea = document.getElementById('report-output');
            textarea.select();
            document.execCommand('copy');
            showToast('คัดลอกรายงาน Linear ไปยัง Clipboard เรียบร้อยแล้ว!');
            closeModal();
        }

        function showToast(msg) {
            let t = document.getElementById('toast-msg');
            document.getElementById('toast-text').innerText = msg;
            t.classList.add('show');
            setTimeout(() => { t.classList.remove('show'); }, 3000);
        }
    </script>
</body>
</html>
"""

with open('./smoke_test_runner.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print('Successfully created smoke_test_runner.html!')
