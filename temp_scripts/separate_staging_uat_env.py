# -*- coding: utf-8 -*-
import openpyxl

# --- 1. Update index.html and smoke_test_runner.html ---
for filename in ['index.html', 'smoke_test_runner.html']:
    with open(f'./{filename}', 'r', encoding='utf-8') as f:
        html = f.read()

    # Separate STAGING and UAT options in dropdown
    old_env_options = """<select id="meta-env-select" onchange="onEnvSelectChange()">
                            <option value="STAGING / UAT">STAGING / UAT</option>"""

    new_env_options = """<select id="meta-env-select" onchange="onEnvSelectChange()">
                            <option value="STAGING">STAGING</option>
                            <option value="UAT">UAT</option>"""

    html = html.replace(old_env_options, new_env_options)
    html = html.replace('<input type="hidden" id="meta-env" value="STAGING / UAT">', '<input type="hidden" id="meta-env" value="STAGING">')
    
    # Fix header description if truncated
    html = html.replace(
        '<p>ระบบบันทึกผลการทดสอบความพร้อม (Smoke Test) E2E OPD to IPD พร้อมออกรายงานสำหรับ</p>',
        '<p>ระบบบันทึกผลการทดสอบความพร้อม (Smoke Test) E2E OPD to IPD พร้อมออกรายงานสำหรับ Linear</p>'
    )

    with open(f'./{filename}', 'w', encoding='utf-8') as f:
        f.write(html)

print('Updated HTML files with separate STAGING and UAT options.')

# --- 2. Update js/app.js ---
with open('./js/app.js', 'r', encoding='utf-8') as f:
    js_code = f.read()

js_code = js_code.replace("let env = m.env || 'STAGING / UAT';", "let env = m.env || 'STAGING';")

with open('./js/app.js', 'w', encoding='utf-8') as f:
    f.write(js_code)

print('Updated js/app.js.')

# --- 3. Update Excel File ---
excel_path = './E2E flow OPD to IPD Only me.xlsx'
wb = openpyxl.load_workbook(excel_path)

if 'Smoke Test Execution' in wb.sheetnames:
    ws = wb['Smoke Test Execution']
    from openpyxl.worksheet.datavalidation import DataValidation
    
    dv_env = DataValidation(type="list", formula1='"STAGING, UAT, DEVELOPMENT (DEV), PRE-PROD, PRODUCTION (PROD), Custom Environment"', allow_blank=True)
    ws.add_data_validation(dv_env)
    dv_env.add("B7")

    print('Updated Excel Data Validation for Environment Cell B7 (Separate STAGING & UAT).')

wb.save(excel_path)
