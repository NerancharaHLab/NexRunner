import openpyxl
from openpyxl.worksheet.datavalidation import DataValidation

# --- 1. Update Excel File ---
excel_path = './E2E flow OPD to IPD Only me.xlsx'
wb = openpyxl.load_workbook(excel_path)

if 'Smoke Test Execution' in wb.sheetnames:
    ws = wb['Smoke Test Execution']
    
    # Update Data Validation for Site Cell B5 to include SBH and TMH
    dv_site = DataValidation(type="list", formula1='"NUH (Naresuan University Hospital), SBH Hospital, TMH Hospital, Siriraj Hospital, Standard E2E Flow, Custom Site"', allow_blank=True)
    ws.add_data_validation(dv_site)
    dv_site.add("B5")

    print('Updated Excel Data Validation with SBH and TMH.')

wb.save(excel_path)

# --- 2. Update Web App HTML File ---
html_path = './smoke_test_runner.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Update Dropdown HTML in web app
old_select_html = """<select id="meta-site-select" onchange="onSiteSelectChange()" style="background: #0F172A; border: 1px solid var(--border-color); color: var(--text-primary); padding: 9px 12px; border-radius: 6px; font-size: 0.9rem; outline: none; cursor: pointer;">
                            <option value="NUH">🏥 NUH (โรงพยาบาลมหาวิทยาลัยนเรศวร)</option>
                            <option value="Standard">🏥 Standard E2E Flow (General Hospital)</option>
                            <option value="Siriraj">🏥 Siriraj Hospital (รพ.ศิริราช)</option>
                            <option value="Custom">✏️ Custom Hospital Site Flow...</option>
                        </select>"""

new_select_html = """<select id="meta-site-select" onchange="onSiteSelectChange()" style="background: #0F172A; border: 1px solid var(--border-color); color: var(--text-primary); padding: 9px 12px; border-radius: 6px; font-size: 0.9rem; outline: none; cursor: pointer;">
                            <option value="NUH">🏥 NUH (โรงพยาบาลมหาวิทยาลัยนเรศวร)</option>
                            <option value="SBH">🏥 SBH (โรงพยาบาลสมเด็จพระบรมราชินีนาถ)</option>
                            <option value="TMH">🏥 TMH (โรงพยาบาลไทยนครินทร์)</option>
                            <option value="Siriraj">🏥 Siriraj Hospital (รพ.ศิริราช)</option>
                            <option value="Standard">🏥 Standard E2E Flow (General Hospital)</option>
                            <option value="Custom">✏️ Custom Hospital Site Flow...</option>
                        </select>"""

html = html.replace(old_select_html, new_select_html)

# Update onSiteSelectChange logic in JS to handle SBH and TMH
old_js_change = """            if (sel === 'NUH') {
                customGrp.style.display = 'none';
                inputSite.value = 'NUH (โรงพยาบาลมหาวิทยาลัยนเรศวร)';
                if (siteScenarioFlows.NUH) activeScenarios = siteScenarioFlows.NUH;
            } else if (sel === 'Siriraj') {
                customGrp.style.display = 'none';
                inputSite.value = 'Siriraj Hospital (รพ.ศิริราช)';
                activeScenarios = siteScenarioFlows.NUH.map(s => ({
                    ...s,
                    name: s.name.replace('NUH:', 'Siriraj:'),
                    desc: s.desc.replace('NUH', 'Siriraj')
                }));
            } else if (sel === 'Standard') {"""

new_js_change = """            if (sel === 'NUH') {
                customGrp.style.display = 'none';
                inputSite.value = 'NUH (โรงพยาบาลมหาวิทยาลัยนเรศวร)';
                if (siteScenarioFlows.NUH) activeScenarios = siteScenarioFlows.NUH;
            } else if (sel === 'SBH') {
                customGrp.style.display = 'none';
                inputSite.value = 'SBH (โรงพยาบาลสมเด็จพระบรมราชินีนาถ)';
                activeScenarios = siteScenarioFlows.NUH.map(s => ({
                    ...s,
                    name: s.name.replace('NUH:', 'SBH:'),
                    desc: s.desc.replace('NUH', 'SBH'),
                    role: s.role.replace('NUH', 'SBH')
                }));
            } else if (sel === 'TMH') {
                customGrp.style.display = 'none';
                inputSite.value = 'TMH (โรงพยาบาลไทยนครินทร์)';
                activeScenarios = siteScenarioFlows.NUH.map(s => ({
                    ...s,
                    name: s.name.replace('NUH:', 'TMH:'),
                    desc: s.desc.replace('NUH', 'TMH'),
                    role: s.role.replace('NUH', 'TMH')
                }));
            } else if (sel === 'Siriraj') {
                customGrp.style.display = 'none';
                inputSite.value = 'Siriraj Hospital (รพ.ศิริราช)';
                activeScenarios = siteScenarioFlows.NUH.map(s => ({
                    ...s,
                    name: s.name.replace('NUH:', 'Siriraj:'),
                    desc: s.desc.replace('NUH', 'Siriraj')
                }));
            } else if (sel === 'Standard') {"""

html = html.replace(old_js_change, new_js_change)

# Update load state JS logic to recognize SBH and TMH
old_load_js = """if (testState.metadata.site.includes('NUH')) sel.value = 'NUH';
                            else if (testState.metadata.site.includes('Standard')) sel.value = 'Standard';"""

new_load_js = """if (testState.metadata.site.includes('NUH')) sel.value = 'NUH';
                            else if (testState.metadata.site.includes('SBH')) sel.value = 'SBH';
                            else if (testState.metadata.site.includes('TMH')) sel.value = 'TMH';
                            else if (testState.metadata.site.includes('Siriraj')) sel.value = 'Siriraj';
                            else if (testState.metadata.site.includes('Standard')) sel.value = 'Standard';"""

html = html.replace(old_load_js, new_load_js)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

print('Updated Web App HTML with SBH and TMH sites.')
