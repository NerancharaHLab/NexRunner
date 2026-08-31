# -*- coding: utf-8 -*-

with open('./js/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

save_load_js = """
/* Test Execution Result Save & Load Logic */
function saveTestResultJSON() {
    saveMetadata();
    
    let m = testState.metadata || {};
    let siteKey = currentSiteKey || 'NUH';
    let siteScenariosState = (testState.scenarios && testState.scenarios[siteKey]) ? testState.scenarios[siteKey] : {};
    
    let p = 0, f = 0, b = 0, nr = 0;
    activeScenarios.forEach(sc => {
        let st = (siteScenariosState[sc.id] && siteScenariosState[sc.id].status) ? siteScenariosState[sc.id].status : 'notrun';
        if (st === 'passed') p++;
        else if (st === 'failed') f++;
        else if (st === 'blocked') b++;
        else nr++;
    });

    let total = activeScenarios.length || 17;
    let rate = Math.round((p / total) * 100);

    let resultPayload = {
        app: "Smoke Test Runner & Report Generator",
        formatVersion: "1.0",
        savedAt: new Date().toISOString(),
        siteKey: siteKey,
        siteName: m.site || siteKey,
        environment: m.env || 'STAGING',
        runId: m.runid || 'SM-RUN-001',
        testCycle: m.cycle || 'Cycle 1',
        executedDate: m.date || new Date().toISOString().split('T')[0],
        tester: m.tester || '',
        dataChain: {
            version: m.ver || '',
            deliveryBatch: m.delivery || '',
            hn: m.hn || '',
            vn: m.vn || '',
            an: m.an || '',
            bill: m.bill || ''
        },
        metrics: {
            totalScenarios: total,
            passed: p,
            failed: f,
            blocked: b,
            notrun: nr,
            passRatePercent: rate,
            criticalPass: activeScenarios.filter(s => s.critical).every(s => siteScenariosState[s.id] && siteScenariosState[s.id].status === 'passed')
        },
        metadata: m,
        scenariosResult: siteScenariosState
    };

    let jsonStr = JSON.stringify(resultPayload, null, 2);
    let blob = new Blob([jsonStr], { type: 'application/json' });
    let url = URL.createObjectURL(blob);

    let cleanRunId = (m.runid || 'RUN').replace(/[^a-zA-Z0-9_-]/g, '');
    let cleanDate = (m.date || new Date().toISOString().split('T')[0]).replace(/[^a-zA-Z0-9_-]/g, '');
    let fileName = `test_result_${siteKey}_${cleanRunId}_${cleanDate}.json`;

    let a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`บันทึกไฟล์ผลการทดสอบ ${fileName} เรียบร้อยแล้ว!`);
}

function triggerImportResult() {
    let input = document.getElementById('import-result-file');
    if (input) input.click();
}

function loadTestResultJSON(event) {
    let file = event.target.files[0];
    if (!file) return;

    let reader = new FileReader();
    reader.onload = function(e) {
        try {
            let data = JSON.parse(e.target.result);
            if (!data.siteKey || !data.scenariosResult) {
                alert('รูปแบบไฟล์ JSON ไม่ถูกต้องสำหรับผลการทดสอบ');
                return;
            }

            // Restore metadata & scenario states
            if (!testState.metadata) testState.metadata = {};
            if (!testState.scenarios) testState.scenarios = {};

            let loadedSite = data.siteKey;
            currentSiteKey = loadedSite;
            testState.metadata.siteKey = loadedSite;

            if (data.metadata) {
                testState.metadata = { ...testState.metadata, ...data.metadata };
            }

            testState.scenarios[loadedSite] = data.scenariosResult;
            saveState();

            // Set UI selectors
            let siteSel = document.getElementById('meta-site-select');
            if (siteSel) siteSel.value = loadedSite;

            restoreSavedSelectors();
            onSiteSelectChange();

            showToast(`โหลดผลการทดสอบจากไฟล์ ${file.name} เรียบร้อยแล้ว!`);
        } catch(err) {
            console.error(err);
            alert('เกิดข้อผิดพลาดในการอ่านไฟล์ JSON: ' + err.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}
"""

if 'saveTestResultJSON' not in app_js:
    app_js += '\n' + save_load_js

with open('./js/app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

print('Updated js/app.js with Save & Load Test Result functions.')
