# -*- coding: utf-8 -*-

for filename in ['index.html', 'smoke_test_runner.html']:
    with open(f'./{filename}', 'r', encoding='utf-8') as f:
        html = f.read()

    html = html.replace(
        '<p>ระบบบันทึกผลการทดสอบความพร้อม (Smoke Test) E2E OPD to IPD พร้อมออกรายงานสำหรับ Linear</p>',
        '<p>ระบบบันทึกผลการทดสอบความพร้อม (Smoke Test) E2E OPD to IPD พร้อมออกรายงาน</p>'
    )
    html = html.replace(
        '<p>ระบบบันทึกผลการทดสอบความพร้อม (Smoke Test) E2E OPD to IPD พร้อมออกรายงานสำหรับ</p>',
        '<p>ระบบบันทึกผลการทดสอบความพร้อม (Smoke Test) E2E OPD to IPD พร้อมออกรายงาน</p>'
    )

    with open(f'./{filename}', 'w', encoding='utf-8') as f:
        f.write(html)

print('Updated subtitle in index.html and smoke_test_runner.html.')
