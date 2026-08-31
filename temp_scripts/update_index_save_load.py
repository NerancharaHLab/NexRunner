# -*- coding: utf-8 -*-

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update header-actions buttons
old_actions = """<div class="header-actions">
                <button class="btn btn-secondary" data-testid="smoke-runner:header:btn__reset-all" onclick="resetAllData()"><i class="fa-solid fa-rotate-left"></i> ล้างข้อมูล</button>
                <button class="btn btn-executive" data-testid="smoke-runner:header:btn__export-executive" onclick="exportExecutiveReport()"><i class="fa-solid fa-chart-line"></i> ออกรายงานผู้บริหาร</button>
                <button class="btn btn-primary" data-testid="smoke-runner:header:btn__export-linear" onclick="exportLinearReport()"><i class="fa-solid fa-paper-plane"></i> ออกรายงาน Linear</button>
            </div>"""

new_actions = """<div class="header-actions">
                <button class="btn btn-secondary" data-testid="smoke-runner:header:btn__reset-all" onclick="resetAllData()"><i class="fa-solid fa-rotate-left"></i> ล้างข้อมูล</button>
                <button class="btn btn-secondary" data-testid="smoke-runner:header:btn__load-result" onclick="triggerImportResult()"><i class="fa-solid fa-folder-open"></i> 📂 โหลดผล</button>
                <button class="btn btn-secondary" data-testid="smoke-runner:header:btn__save-result" onclick="saveTestResultJSON()"><i class="fa-solid fa-floppy-disk"></i> 💾 บันทึกผล</button>
                <button class="btn btn-executive" data-testid="smoke-runner:header:btn__export-executive" onclick="exportExecutiveReport()"><i class="fa-solid fa-chart-line"></i> ออกรายงานผู้บริหาร</button>
                <button class="btn btn-primary" data-testid="smoke-runner:header:btn__export-linear" onclick="exportLinearReport()"><i class="fa-solid fa-paper-plane"></i> ออกรายงาน Linear</button>
                <input type="file" id="import-result-file" accept=".json" onchange="loadTestResultJSON(event)" style="display:none;">
            </div>"""

html = html.replace(old_actions, new_actions)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('Updated index.html with Save & Load Test Result buttons.')
