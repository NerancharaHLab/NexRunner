# -*- coding: utf-8 -*-

with open('./js/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

exec_js_functions = """
/* Executive Sign-off Report Modal Logic */
function exportExecutiveReport() {
    let m = testState.metadata || {};
    let site = m.site || 'NUH (โรงพยาบาลมหาวิทยาลัยนเรศวร)';
    let ver = m.ver || '-';
    let delivery = m.delivery || '-';
    let runid = m.runid || '-';
    let cycle = m.cycle || '-';
    let date = m.date || new Date().toISOString().split('T')[0];
    let tester = m.tester || '[ยังไม่ได้ระบุชื่อ]';
    let env = m.env || 'STAGING';

    let siteKey = currentSiteKey || 'NUH';
    let siteScenariosState = (testState.scenarios && testState.scenarios[siteKey]) ? testState.scenarios[siteKey] : {};

    let p = 0, f = 0, b = 0, nr = 0;
    let critBody = document.getElementById('exec-crit-body');
    let defectBody = document.getElementById('exec-defect-body');
    if (critBody) critBody.innerHTML = '';
    if (defectBody) defectBody.innerHTML = '';

    let hasDefects = false;

    activeScenarios.forEach(sc => {
        let st = (siteScenariosState[sc.id] && siteScenariosState[sc.id].status) ? siteScenariosState[sc.id].status : 'notrun';
        let notes = (siteScenariosState[sc.id] && siteScenariosState[sc.id].notes) ? siteScenariosState[sc.id].notes : '';

        if (st === 'passed') p++;
        else if (st === 'failed') f++;
        else if (st === 'blocked') b++;
        else nr++;

        // Critical Matrix
        if (sc.critical && critBody) {
            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${sc.id}</strong></td>
                <td>${sc.name}</td>
                <td>${sc.role}</td>
                <td style="text-align: center;"><span class="status-badge badge-${st}">${st.toUpperCase()}</span></td>
            `;
            critBody.appendChild(tr);
        }

        // Defect Log
        if ((st === 'failed' || st === 'blocked' || notes) && defectBody) {
            hasDefects = true;
            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${sc.id}</strong></td>
                <td>${sc.name}</td>
                <td>${notes || 'ยังไม่ได้ระบุรายละเอียด Bug'}</td>
                <td style="text-align: center;"><span class="status-badge badge-${st}">${st.toUpperCase()}</span></td>
            `;
            defectBody.appendChild(tr);
        }
    });

    if (!hasDefects && defectBody) {
        defectBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--pass-color); padding: 12px;">✨ ไม่พบข้อบกพร่อง (No Defect Found) ในการทดสอบชุดนี้</td></tr>`;
    }

    let total = activeScenarios.length || 17;
    let rate = Math.round((p / total) * 100);

    if (document.getElementById('exec-kpi-pass')) document.getElementById('exec-kpi-pass').innerText = p;
    if (document.getElementById('exec-kpi-fail')) document.getElementById('exec-kpi-fail').innerText = f;
    if (document.getElementById('exec-kpi-block')) document.getElementById('exec-kpi-block').innerText = b;
    if (document.getElementById('exec-kpi-notrun')) document.getElementById('exec-kpi-notrun').innerText = nr;

    if (document.getElementById('exec-rate-big')) document.getElementById('exec-rate-big').innerText = rate + '%';
    if (document.getElementById('exec-site-name')) document.getElementById('exec-site-name').innerText = site;
    if (document.getElementById('exec-doc-date')) document.getElementById('exec-doc-date').innerText = date;
    if (document.getElementById('exec-env-name')) document.getElementById('exec-env-name').innerText = env;
    if (document.getElementById('exec-tester-sig')) document.getElementById('exec-tester-sig').innerText = `( ${tester} )`;

    // Traceability
    if (document.getElementById('exec-ver')) document.getElementById('exec-ver').innerText = ver;
    if (document.getElementById('exec-batch')) document.getElementById('exec-batch').innerText = delivery;
    if (document.getElementById('exec-run-cycle')) document.getElementById('exec-run-cycle').innerText = `${cycle} (${runid})`;
    if (document.getElementById('exec-hn')) document.getElementById('exec-hn').innerText = m.hn || '-';
    if (document.getElementById('exec-vn')) document.getElementById('exec-vn').innerText = m.vn || '-';
    if (document.getElementById('exec-an')) document.getElementById('exec-an').innerText = m.an || '-';
    if (document.getElementById('exec-bill')) document.getElementById('exec-bill').innerText = m.bill || '-';

    // Critical check
    let critPass = activeScenarios.filter(s => s.critical).every(s => siteScenariosState[s.id] && siteScenariosState[s.id].status === 'passed');
    let gateBadge = document.getElementById('exec-gate-banner');
    if (gateBadge) {
        if (critPass && f === 0 && b === 0 && activeScenarios.length > 0) {
            gateBadge.className = "decision-gate-banner gate-approved";
            gateBadge.innerHTML = `<div><div class="gate-title"><i class="fa-solid fa-circle-check"></i> APPROVED FOR UAT SIGN-OFF</div><div class="gate-subtitle">ระบบผ่านการตรวจความพร้อมหลักครบถ้วน อนุมัติเปิดให้ผู้ใช้งานทดสอบรอบ UAT ได้ตามกำหนดการ</div></div><div style="text-align: right;"><div style="font-size:0.8rem;">PASS RATE</div><div style="font-size:1.8rem; font-weight:800;">${rate}%</div></div>`;
        } else {
            gateBadge.className = "decision-gate-banner gate-rejected";
            gateBadge.innerHTML = `<div><div class="gate-title"><i class="fa-solid fa-circle-xmark"></i> REJECTED FOR UAT SIGN-OFF</div><div class="gate-subtitle">ระบบยังมีข้อบกพร่องใน Critical Flow หรือยังมีรายการทดสอบไม่ผ่าน โปรดแก้ไข Bug ก่อนเริ่ม UAT</div></div><div style="text-align: right;"><div style="font-size:0.8rem;">PASS RATE</div><div style="font-size:1.8rem; font-weight:800;">${rate}%</div></div>`;
        }
    }

    let modal = document.getElementById('exec-report-modal');
    if (modal) modal.classList.add('active');
}

function closeExecutiveModal() {
    let modal = document.getElementById('exec-report-modal');
    if (modal) modal.classList.remove('active');
}

function openExecutiveReportPage() {
    saveMetadata();
    window.open('executive_report.html', '_blank');
}
"""

if 'exportExecutiveReport' not in app_js:
    app_js += '\n' + exec_js_functions

with open('./js/app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

print('Updated js/app.js with Executive Report functions.')
