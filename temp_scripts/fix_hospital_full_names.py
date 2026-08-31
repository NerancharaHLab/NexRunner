import openpyxl
from openpyxl.worksheet.datavalidation import DataValidation

# --- 1. Update Excel File ---
excel_path = './E2E flow OPD to IPD Only me.xlsx'
wb = openpyxl.load_workbook(excel_path)

if 'Smoke Test Execution' in wb.sheetnames:
    ws = wb['Smoke Test Execution']
    
    # Update Data Validation for Site Cell B5
    dv_site = DataValidation(type="list", formula1='"NUH (Naresuan University Hospital), SBH (โรงพยาบาลสระบุรี), TMH (โรงพยาบาลเวชศาสตร์เขตร้อน), Siriraj Hospital, Standard E2E Flow, Custom Site"', allow_blank=True)
    ws.add_data_validation(dv_site)
    dv_site.add("B5")

    print('Updated Excel Data Validation with Saraburi Hospital & Hospital for Tropical Diseases.')

wb.save(excel_path)

# --- 2. Update Web App HTML File ---
html_path = './smoke_test_runner.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Replace SBH and TMH option text in Dropdown
html = html.replace(
    '<option value="SBH">🏥 SBH (โรงพยาบาลสมเด็จพระบรมราชินีนาถ)</option>',
    '<option value="SBH">🏥 SBH (โรงพยาบาลสระบุรี)</option>'
)

html = html.replace(
    '<option value="TMH">🏥 TMH (โรงพยาบาลไทยนครินทร์)</option>',
    '<option value="TMH">🏥 TMH (โรงพยาบาลเวชศาสตร์เขตร้อน)</option>'
)

# Replace inputSite values in JS
html = html.replace(
    "inputSite.value = 'SBH (โรงพยาบาลสมเด็จพระบรมราชินีนาถ)';",
    "inputSite.value = 'SBH (โรงพยาบาลสระบุรี)';"
)

html = html.replace(
    "inputSite.value = 'TMH (โรงพยาบาลไทยนครินทร์)';",
    "inputSite.value = 'TMH (โรงพยาบาลเวชศาสตร์เขตร้อน)';"
)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

print('Updated Web App HTML with correct full hospital names.')
