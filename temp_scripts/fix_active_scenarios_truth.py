import re
import openpyxl
from openpyxl.worksheet.datavalidation import DataValidation

# --- 1. Update Excel File ---
excel_path = './E2E flow OPD to IPD Only me.xlsx'
wb = openpyxl.load_workbook(excel_path)

if 'Smoke Test Execution' in wb.sheetnames:
    ws = wb['Smoke Test Execution']
    
    # Update Data Validation for Site Cell B5
    dv_site = DataValidation(type="list", formula1='"NUH (Naresuan University Hospital), Standard (General Hospital), SBH (โรงพยาบาลสระบุรี), TMH (โรงพยาบาลเวชศาสตร์เขตร้อน), Custom Site"', allow_blank=True)
    ws.add_data_validation(dv_site)
    dv_site.add("B5")

    print('Updated Excel Data Validation to reflect NUH & Standard primary suites.')

wb.save(excel_path)

# --- 2. Update Web App HTML ---
html_path = './smoke_test_runner.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Update Select dropdown in HTML with clean grouping
old_select = """<select id="meta-site-select" onchange="onSiteSelectChange()" style="background: #0F172A; border: 1px solid var(--border-color); color: var(--text-primary); padding: 9px 12px; border-radius: 6px; font-size: 0.9rem; outline: none; cursor: pointer;">
                            <option value="NUH">🏥 NUH (โรงพยาบาลมหาวิทยาลัยนเรศวร)</option>
                            <option value="SBH">🏥 SBH (โรงพยาบาลสระบุรี)</option>
                            <option value="TMH">🏥 TMH (โรงพยาบาลเวชศาสตร์เขตร้อน)</option>
                            <option value="Siriraj">🏥 Siriraj Hospital (รพ.ศิริราช)</option>
                            <option value="Standard">🏥 Standard E2E Flow (General Hospital)</option>
                            <option value="Custom">✏️ Custom Hospital Site Flow...</option>
                        </select>"""

new_select = """<select id="meta-site-select" onchange="onSiteSelectChange()" style="background: #0F172A; border: 1px solid var(--border-color); color: var(--text-primary); padding: 9px 12px; border-radius: 6px; font-size: 0.9rem; outline: none; cursor: pointer;">
                            <option value="NUH">🏥 NUH (โรงพยาบาลมหาวิทยาลัยนเรศวร) [มี Scenario พร้อมใช้งาน]</option>
                            <option value="Standard">🏥 Standard (General Hospital) [มี Scenario พร้อมใช้งาน]</option>
                            <option value="SBH">🏥 SBH (โรงพยาบาลสระบุรี)</option>
                            <option value="TMH">🏥 TMH (โรงพยาบาลเวชศาสตร์เขตร้อน)</option>
                            <option value="Custom">✏️ Custom Hospital Site Flow...</option>
                        </select>"""

html = html.replace(old_select, new_select)

# Update onSiteSelectChange logic in JS
old_on_change = """        function onSiteSelectChange() {
            let sel = document.getElementById('meta-site-select').value;
            let customGrp = document.getElementById('custom-site-group');
            let inputSite = document.getElementById('meta-site');

            if (sel === 'NUH') {
                customGrp.style.display = 'none';
                inputSite.value = 'NUH (โรงพยาบาลมหาวิทยาลัยนเรศวร)';
                activeScenarios = siteScenarioFlows.NUH;
            } else if (sel === 'SBH') {
                customGrp.style.display = 'none';
                inputSite.value = 'SBH (โรงพยาบาลสระบุรี)';
                activeScenarios = siteScenarioFlows.SBH;
            } else if (sel === 'TMH') {
                customGrp.style.display = 'none';
                inputSite.value = 'TMH (โรงพยาบาลเวชศาสตร์เขตร้อน)';
                activeScenarios = siteScenarioFlows.TMH;
            } else if (sel === 'Siriraj') {
                customGrp.style.display = 'none';
                inputSite.value = 'Siriraj Hospital (รพ.ศิริราช)';
                activeScenarios = siteScenarioFlows.Siriraj;
            } else if (sel === 'Standard') {
                customGrp.style.display = 'none';
                inputSite.value = 'Standard E2E Flow';
                activeScenarios = siteScenarioFlows.Standard;
            } else {
                customGrp.style.display = 'flex';
                activeScenarios = siteScenarioFlows.Standard;
            }
            
            saveMetadata();
            renderScenarios();
            updateMetrics();
        }"""

new_on_change = """        function onSiteSelectChange() {
            let sel = document.getElementById('meta-site-select').value;
            let customGrp = document.getElementById('custom-site-group');
            let inputSite = document.getElementById('meta-site');

            if (sel === 'NUH') {
                customGrp.style.display = 'none';
                inputSite.value = 'NUH (โรงพยาบาลมหาวิทยาลัยนเรศวร)';
                activeScenarios = siteScenarioFlows.NUH;
            } else if (sel === 'Standard') {
                customGrp.style.display = 'none';
                inputSite.value = 'Standard (General Hospital)';
                activeScenarios = siteScenarioFlows.Standard;
            } else if (sel === 'SBH') {
                customGrp.style.display = 'none';
                inputSite.value = 'SBH (โรงพยาบาลสระบุรี)';
                activeScenarios = siteScenarioFlows.SBH || siteScenarioFlows.Standard;
            } else if (sel === 'TMH') {
                customGrp.style.display = 'none';
                inputSite.value = 'TMH (โรงพยาบาลเวชศาสตร์เขตร้อน)';
                activeScenarios = siteScenarioFlows.TMH || siteScenarioFlows.Standard;
            } else {
                customGrp.style.display = 'flex';
                activeScenarios = siteScenarioFlows.Standard;
            }
            
            saveMetadata();
            renderScenarios();
            updateMetrics();
        }"""

html = html.replace(old_on_change, new_on_change)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

print('Updated Web App HTML to reflect active scenarios truth.')
