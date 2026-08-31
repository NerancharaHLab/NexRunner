# -*- coding: utf-8 -*-

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Add Executive Report button in header-actions
old_header_actions = """<div class="header-actions">
                <button class="btn btn-secondary" data-testid="smoke-runner:header:btn__reset-all" onclick="resetAllData()"><i class="fa-solid fa-rotate-left"></i> ล้างข้อมูล</button>
                <button class="btn btn-primary" data-testid="smoke-runner:header:btn__export-linear" onclick="exportLinearReport()"><i class="fa-solid fa-paper-plane"></i> ออกรายงาน Linear</button>
            </div>"""

new_header_actions = """<div class="header-actions">
                <button class="btn btn-secondary" data-testid="smoke-runner:header:btn__reset-all" onclick="resetAllData()"><i class="fa-solid fa-rotate-left"></i> ล้างข้อมูล</button>
                <button class="btn btn-executive" data-testid="smoke-runner:header:btn__export-executive" onclick="exportExecutiveReport()"><i class="fa-solid fa-chart-line"></i> ออกรายงานผู้บริหาร</button>
                <button class="btn btn-primary" data-testid="smoke-runner:header:btn__export-linear" onclick="exportLinearReport()"><i class="fa-solid fa-paper-plane"></i> ออกรายงาน Linear</button>
            </div>"""

html = html.replace(old_header_actions, new_header_actions)

# 2. Add Executive Modal HTML structure before </body>
exec_modal_html = """
    <!-- Executive Sign-off Report Modal -->
    <div class="modal-overlay" id="exec-report-modal">
        <div class="executive-modal-box">
            <div class="exec-header">
                <div>
                    <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--accent-color);"><i class="fa-solid fa-square-poll-vertical"></i> EXECUTIVE VERIFICATION & SIGN-OFF REPORT</h2>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">รายงานสรุปผลการทดสอบระดับผู้บริหารและอนุมัติลงนามก่อนเปิดรอบ UAT</p>
                </div>
                <button class="close-modal" onclick="closeExecutiveModal()"><i class="fa-solid fa-xmark"></i></button>
            </div>

            <!-- Decision Gate Status Banner -->
            <div id="exec-gate-banner" class="decision-gate-banner gate-rejected">
                <div>
                    <div class="gate-title"><i class="fa-solid fa-circle-xmark"></i> REJECTED FOR UAT SIGN-OFF</div>
                    <div class="gate-subtitle">ระบบยังมีข้อบกพร่องใน Critical Flow หรือยังมีรายการทดสอบไม่ผ่าน</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.8rem; opacity: 0.8;">PASS RATE</div>
                    <div style="font-size: 1.8rem; font-weight: 800;" id="exec-rate-big">0%</div>
                </div>
            </div>

            <!-- Traceability Info -->
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; font-size: 0.88rem; background: rgba(255,255,255,0.02); padding: 16px; border-radius: 8px; border: 1px solid var(--border-color);">
                <div><strong>🏥 Hospital Site:</strong> <span id="exec-site-name">-</span></div>
                <div><strong>🗓 Issued Date:</strong> <span id="exec-doc-date">-</span></div>
                <div><strong>📌 Version:</strong> <span id="exec-ver">-</span> | <strong>Batch:</strong> <span id="exec-batch">-</span></div>
                <div><strong>🌐 Environment:</strong> <span id="exec-env-name">-</span> | <strong>Cycle/Run:</strong> <span id="exec-run-cycle">-</span></div>
                <div><strong>🔗 HN:</strong> <span id="exec-hn">-</span> | <strong>VN:</strong> <span id="exec-vn">-</span></div>
                <div><strong>🔗 AN:</strong> <span id="exec-an">-</span> | <strong>Bill:</strong> <span id="exec-bill">-</span></div>
            </div>

            <!-- Executive KPI Grid -->
            <div class="exec-kpi-grid">
                <div class="exec-kpi-card">
                    <div class="num" style="color: var(--pass-color);" id="exec-kpi-pass">0</div>
                    <div class="label">Passed</div>
                </div>
                <div class="exec-kpi-card">
                    <div class="num" style="color: var(--fail-color);" id="exec-kpi-fail">0</div>
                    <div class="label">Failed</div>
                </div>
                <div class="exec-kpi-card">
                    <div class="num" style="color: var(--block-color);" id="exec-kpi-block">0</div>
                    <div class="label">Blocked</div>
                </div>
                <div class="exec-kpi-card">
                    <div class="num" style="color: var(--notrun-color);" id="exec-kpi-notrun">0</div>
                    <div class="label">Not Run</div>
                </div>
            </div>

            <!-- Critical Matrix -->
            <h4 style="margin-bottom: 10px; color: var(--accent-color); font-size: 0.95rem;"><i class="fa-solid fa-triangle-exclamation"></i> Critical Flow Verification Matrix</h4>
            <table class="exec-table">
                <thead>
                    <tr>
                        <th style="width: 15%;">Scenario ID</th>
                        <th style="width: 45%;">Scenario Name</th>
                        <th style="width: 25%;">Role</th>
                        <th style="width: 15%; text-align: center;">Status</th>
                    </tr>
                </thead>
                <tbody id="exec-crit-body"></tbody>
            </table>

            <!-- Defect Matrix -->
            <h4 style="margin-bottom: 10px; color: #EF4444; font-size: 0.95rem;"><i class="fa-solid fa-bug"></i> Defect Log & Risk Audit</h4>
            <table class="exec-table">
                <thead>
                    <tr>
                        <th style="width: 15%;">Scenario ID</th>
                        <th style="width: 45%;">Scenario Name</th>
                        <th style="width: 25%;">Defect / Remarks</th>
                        <th style="width: 15%; text-align: center;">Status</th>
                    </tr>
                </thead>
                <tbody id="exec-defect-body"></tbody>
            </table>

            <!-- Signatures -->
            <div class="exec-sig-grid">
                <div class="exec-sig-box">
                    <div style="font-size: 0.85rem; font-weight: 700;">PREPARED BY (QA LEAD)</div>
                    <div class="exec-sig-line"></div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);" id="exec-tester-sig">( .................................................... )</div>
                </div>
                <div class="exec-sig-box">
                    <div style="font-size: 0.85rem; font-weight: 700;">APPROVED FOR UAT (EXECUTIVE / CLIENT)</div>
                    <div class="exec-sig-line"></div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">( .................................................... )</div>
                </div>
            </div>

            <!-- Footer Actions -->
            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
                <button class="btn btn-secondary" onclick="closeExecutiveModal()">ปิดหน้าต่าง</button>
                <button class="btn btn-primary" onclick="openExecutiveReportPage()"><i class="fa-solid fa-up-right-from-square"></i> 🌐 เปิดในหน้าใหม่ A4 Printable</button>
            </div>
        </div>
    </div>
"""

if 'exec-report-modal' not in html:
    html = html.replace('</body>', exec_modal_html + '\n</body>')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('Updated index.html with Executive Report button and modal.')
