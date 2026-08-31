import openpyxl
from openpyxl.worksheet.datavalidation import DataValidation

excel_path = './E2E flow OPD to IPD Only me.xlsx'
wb = openpyxl.load_workbook(excel_path)

if 'Smoke Test Execution' in wb.sheetnames:
    ws = wb['Smoke Test Execution']
    
    # Update Data Validation for Environment Cell B7
    dv_env = DataValidation(type="list", formula1='"STAGING / UAT, DEVELOPMENT (DEV), PRE-PROD, PRODUCTION (PROD), Custom Environment"', allow_blank=True)
    ws.add_data_validation(dv_env)
    dv_env.add("B7")

    print('Updated Excel Data Validation for Environment Cell B7.')

wb.save(excel_path)
