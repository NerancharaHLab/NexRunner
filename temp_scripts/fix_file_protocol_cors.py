# -*- coding: utf-8 -*-
import json
import os

# Load all JSON scenario files
with open('./scenarios/sites.json', 'r', encoding='utf-8') as f:
    sites_json = json.load(f)

scenarios_embedded = {}
for h in sites_json['hospitals']:
    fpath = f"./scenarios/{h['file']}"
    if os.path.exists(fpath):
        with open(fpath, 'r', encoding='utf-8') as f:
            scenarios_embedded[h['id']] = json.load(f)

# Write an embedded fallback dictionary into js/app.js
embedded_js = f"""// Embedded Scenarios & Sites Registry Fallback (Supports file:// protocol without web server)
const EMBEDDED_SITES_CONFIG = {json.dumps(sites_json, ensure_ascii=False, indent=2)};

const EMBEDDED_SCENARIOS = {json.dumps(scenarios_embedded, ensure_ascii=False, indent=2)};
"""

with open('./js/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# Prepend EMBEDDED constants to app.js
if 'EMBEDDED_SITES_CONFIG' not in app_js:
    app_js = embedded_js + '\n' + app_js

# Update loadAppConfig to use EMBEDDED_SITES_CONFIG on file:// CORS failure
old_load_config = """async function loadAppConfig() {
    try {
        let response = await fetch('./scenarios/sites.json');
        if (!response.ok) throw new Error('HTTP error ' + response.status);
        appConfig = await response.json();
    } catch (err) {
        console.warn('Failed to load sites.json, using fallback config:', err);
        appConfig = {
            hospitals: [
                { id: "NUH", name: "🏥 NUH (โรงพยาบาลมหาวิทยาลัยนเรศวร)", file: "nuh.json" },
                { id: "SBH", name: "🏥 SBH (โรงพยาบาลสระบุรี)", file: "sbh.json" },
                { id: "TMH", name: "🏥 TMH (โรงพยาบาลเวชศาสตร์เขตร้อน)", file: "tmh.json" },
                { id: "Siriraj", name: "🏥 Siriraj Hospital (รพ.ศิริราช)", file: "siriraj.json" },
                { id: "Standard", name: "🏥 Standard (General Hospital)", file: "standard.json" }
            ],
            environments: ["STAGING", "UAT", "DEVELOPMENT (DEV)", "PRE-PROD", "PRODUCTION (PROD)"],
            dataChainFields: [
                { id: "ver", label: "SYSTEM VERSION", type: "text", default: "v1.0.0", span: 1 },
                { id: "delivery", label: "DELIVERY BATCH (งวดส่งงาน)", type: "text", default: "D 1", span: 1 },
                { id: "runid", label: "RUN ID", type: "text", default: "SM-RUN-001", span: 1 },
                { id: "cycle", label: "TEST CYCLE", type: "text", default: "Cycle 1", span: 1 },
                { id: "date", label: "DATE EXECUTED", type: "date", default: "today", span: 1 },
                { id: "tester", label: "TESTER NAME", type: "text", placeholder: "ชื่อผู้ทดสอบ...", span: 1 },
                { id: "hn", label: "PRIMARY HN", type: "text", placeholder: "HN......", span: 1 },
                { id: "vn", label: "PRIMARY VN", type: "text", placeholder: "VN......", span: 1 },
                { id: "an", label: "PRIMARY AN", type: "text", placeholder: "AN......", span: 1 },
                { id: "bill", label: "BILL NO. / INV", type: "text", placeholder: "INV......", span: 1 }
            ]
        };
    }

    renderHospitalDropdown();
    renderEnvironmentDropdown();
    renderDataChainFields();
    restoreSavedSelectors();
    await onSiteSelectChange();
}"""

new_load_config = """async function loadAppConfig() {
    try {
        let response = await fetch('./scenarios/sites.json');
        if (!response.ok) throw new Error('HTTP error ' + response.status);
        appConfig = await response.json();
    } catch (err) {
        console.warn('File protocol or fetch blocked, loading from EMBEDDED_SITES_CONFIG:', err);
        appConfig = EMBEDDED_SITES_CONFIG;
    }

    renderDataChainFields();
    restoreSavedSelectors();
    await onSiteSelectChange();
}"""

app_js = app_js.replace(old_load_config, new_load_config)

# Update fetchScenarioJSON to use EMBEDDED_SCENARIOS on file:// CORS failure
old_fetch_json = """async function fetchScenarioJSON(fileName) {
    try {
        let response = await fetch('./scenarios/' + fileName);
        if (!response.ok) throw new Error('HTTP error ' + response.status);
        let data = await response.json();
        
        activeScenarios = data.scenarios || [];
        if (data.siteName) {
            let siteInp = document.getElementById('meta-site');
            if (siteInp) siteInp.value = data.siteName;
        }
        
        renderCategoryFilters();
        renderScenarios();
        updateMetrics();
    } catch (err) {
        console.warn('Failed to fetch JSON, using standard fallback:', err);
        await loadFallbackScenarioData(fileName.replace('.json', ''));
    }
}"""

new_fetch_json = """async function fetchScenarioJSON(fileName) {
    try {
        let response = await fetch('./scenarios/' + fileName);
        if (!response.ok) throw new Error('HTTP error ' + response.status);
        let data = await response.json();
        
        activeScenarios = data.scenarios || [];
        if (data.siteName) {
            let siteInp = document.getElementById('meta-site');
            if (siteInp) siteInp.value = data.siteName;
        }
    } catch (err) {
        console.warn('Fetch blocked (file:// protocol), using EMBEDDED_SCENARIOS fallback for:', currentSiteKey, err);
        let siteData = EMBEDDED_SCENARIOS[currentSiteKey] || EMBEDDED_SCENARIOS['NUH'] || EMBEDDED_SCENARIOS['Standard'];
        if (siteData) {
            activeScenarios = siteData.scenarios || [];
            if (siteData.siteName) {
                let siteInp = document.getElementById('meta-site');
                if (siteInp) siteInp.value = siteData.siteName;
            }
        } else {
            await loadFallbackScenarioData(currentSiteKey);
        }
    }

    renderCategoryFilters();
    renderScenarios();
    updateMetrics();
}"""

app_js = app_js.replace(old_fetch_json, new_fetch_json)

with open('./js/app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

print('Successfully updated js/app.js to support file:// protocol with embedded fallback.')
