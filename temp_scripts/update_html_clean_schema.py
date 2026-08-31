# -*- coding: utf-8 -*-

clean_html_content = """<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🏥 Smoke Test Runner & Report Generator</title>

    <!-- Google Fonts & Font Awesome Icons -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <!-- Modular CSS Stylesheet -->
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>

    <div class="container">
        <!-- Application Header -->
        <header>
            <div class="header-title">
                <h1><i class="fa-solid fa-hospital-user" style="color: #6366F1;"></i> Smoke Test Runner & Report Generator</h1>
                <p>ระบบบันทึกผลการทดสอบความพร้อม (Smoke Test) E2E OPD to IPD พร้อมออกรายงานสำหรับ Linear</p>
            </div>
            <div class="header-actions">
                <button class="btn btn-secondary" data-testid="smoke-runner:header:btn__reset-all" onclick="resetAllData()"><i class="fa-solid fa-rotate-left"></i> ล้างข้อมูล</button>
                <button class="btn btn-primary" data-testid="smoke-runner:header:btn__export-linear" onclick="exportLinearReport()"><i class="fa-solid fa-paper-plane"></i> ออกรายงาน Linear</button>
            </div>
        </header>

        <!-- Top Dashboard & Data Chain Tracker -->
        <div class="dashboard-grid">
            <!-- Data Chain Tracker Container (Rendered Dynamically from sites.json) -->
            <div class="card">
                <div class="card-header">
                    <i class="fa-solid fa-link" style="color: #38BDF8;"></i> Data Chain Tracker (ข้อมูลสายสะสม)
                </div>
                <div class="datachain-grid" id="datachain-fields-container">
                    <!-- Rendered dynamically by app.js from dataChainFields schema -->
                </div>
            </div>

            <!-- Execution Status & Decision Gate Stats -->
            <div class="card stats-container">
                <div class="card-header">
                    <i class="fa-solid fa-chart-pie" style="color: #10B981;"></i> Status Summary & Gate
                </div>
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
                        <span>Pass Rate Completion</span>
                        <strong id="pass-rate-text">0% (0/17)</strong>
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

        <!-- Filter Controls -->
        <div class="controls-bar">
            <div class="filter-buttons" id="filter-buttons-container">
                <!-- Rendered dynamically by app.js from activeScenarios -->
            </div>
            <div class="search-box">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="text" id="search-input" data-testid="smoke-runner:controls:input__search" placeholder="ค้นหา Scenario ID, ชื่อบททดสอบ..." onkeyup="filterSearch()">
            </div>
        </div>

        <!-- Dynamic Scenarios List -->
        <div class="scenarios-list" id="scenarios-container">
            <!-- Rendered dynamically by app.js -->
        </div>
    </div>

    <!-- Linear Report Output Modal -->
    <div class="modal-overlay" id="report-modal">
        <div class="modal-box">
            <div class="modal-header">
                <h3><i class="fa-solid fa-file-contract" style="color: #6366F1;"></i> Linear Report Summary (Sign-off Matrix)</h3>
                <button class="close-modal" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px;">
                คัดกรองข้อความ Markdown สรุปผลนี้ แล้วนำไปวางส่งใน Linear เพื่อใช้เป็นหลักฐานยืนยันก่อนเริ่มรอบ UAT:
            </p>
            <textarea id="report-output" class="report-textarea" readonly></textarea>
            <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button class="btn btn-secondary" onclick="closeModal()">ปิดหน้าต่าง</button>
                <button class="btn btn-success" onclick="copyReportToClipboard()"><i class="fa-regular fa-copy"></i> คัดกรองข้อความ (Copy Report)</button>
            </div>
        </div>
    </div>

    <!-- Toast Notification -->
    <div class="toast" id="toast-msg">
        <i class="fa-solid fa-circle-check"></i> <span id="toast-text">สำเร็จ</span>
    </div>

    <!-- Modular Application Logic Script -->
    <script src="js/app.js"></script>

</body>
</html>
"""

for fname in ['index.html', 'smoke_test_runner.html']:
    with open(f'./{fname}', 'w', encoding='utf-8') as f:
        f.write(clean_html_content)

print('Successfully cleaned index.html and smoke_test_runner.html to use dynamic schema rendering.')
