# -*- coding: utf-8 -*-

with open('./js/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# Update setStatus, setNotes, renderScenarios, and updateMetrics to scope scenario states per site and default to 'notrun'

old_set_status = """function setStatus(scId, status) {
    if (!testState.scenarios) testState.scenarios = {};
    if (!testState.scenarios[scId]) testState.scenarios[scId] = {};
    testState.scenarios[scId].status = status;
    
    let cleanId = scId.replace(/[^a-zA-Z0-9]/g, '');
    let item = document.getElementById('sc-item-' + cleanId);
    if (item) {
        item.className = 'scenario-item ' + status.toLowerCase();
    }

    let btns = document.querySelectorAll(`#btn-grp-${cleanId} .status-btn`);
    btns.forEach(b => {
        if (b.getAttribute('data-status') === status) b.classList.add('active');
        else b.classList.remove('active');
    });

    saveState();
}"""

new_set_status = """function setStatus(scId, status) {
    if (!testState.scenarios) testState.scenarios = {};
    let siteKey = currentSiteKey || 'NUH';
    if (!testState.scenarios[siteKey]) testState.scenarios[siteKey] = {};
    if (!testState.scenarios[siteKey][scId]) testState.scenarios[siteKey][scId] = { status: 'notrun', notes: '' };
    
    testState.scenarios[siteKey][scId].status = status || 'notrun';
    
    let cleanId = scId.replace(/[^a-zA-Z0-9]/g, '');
    let item = document.getElementById('sc-item-' + cleanId);
    if (item) {
        item.className = 'scenario-item ' + (status || 'notrun').toLowerCase();
    }

    let btns = document.querySelectorAll(`#btn-grp-${cleanId} .status-btn`);
    btns.forEach(b => {
        if (b.getAttribute('data-status') === status) b.classList.add('active');
        else b.classList.remove('active');
    });

    saveState();
}"""

app_js = app_js.replace(old_set_status, new_set_status)

# Update setNotes
old_set_notes = """function setNotes(scId, val) {
    if (!testState.scenarios) testState.scenarios = {};
    if (!testState.scenarios[scId]) testState.scenarios[scId] = {};
    testState.scenarios[scId].notes = val;
    saveState();
}"""

new_set_notes = """function setNotes(scId, val) {
    if (!testState.scenarios) testState.scenarios = {};
    let siteKey = currentSiteKey || 'NUH';
    if (!testState.scenarios[siteKey]) testState.scenarios[siteKey] = {};
    if (!testState.scenarios[siteKey][scId]) testState.scenarios[siteKey][scId] = { status: 'notrun', notes: '' };
    
    testState.scenarios[siteKey][scId].notes = val;
    saveState();
}"""

app_js = app_js.replace(old_set_notes, new_set_notes)

# Update renderScenarios helper to get scenario state with default 'notrun'
old_get_state_render = """        let stateObj = (testState.scenarios && testState.scenarios[sc.id]) ? testState.scenarios[sc.id] : { status: 'notrun', notes: '' };
        let st = stateObj.status || 'notrun';
        let notesVal = stateObj.notes || '';"""

new_get_state_render = """        let siteKey = currentSiteKey || 'NUH';
        let siteScenariosState = (testState.scenarios && testState.scenarios[siteKey]) ? testState.scenarios[siteKey] : {};
        let stateObj = siteScenariosState[sc.id] || { status: 'notrun', notes: '' };
        let st = stateObj.status || 'notrun';
        let notesVal = stateObj.notes || '';"""

app_js = app_js.replace(old_get_state_render, new_get_state_render)

# Update updateMetrics helper
old_metrics_loop = """    activeScenarios.forEach(sc => {
        let st = (testState.scenarios && testState.scenarios[sc.id]) ? testState.scenarios[sc.id].status : 'notrun';
        if (st === 'passed') p++;
        else if (st === 'failed') f++;
        else if (st === 'blocked') b++;
        else nr++;
    });"""

new_metrics_loop = """    let siteKey = currentSiteKey || 'NUH';
    let siteScenariosState = (testState.scenarios && testState.scenarios[siteKey]) ? testState.scenarios[siteKey] : {};

    activeScenarios.forEach(sc => {
        let st = (siteScenariosState[sc.id] && siteScenariosState[sc.id].status) ? siteScenariosState[sc.id].status : 'notrun';
        if (st === 'passed') p++;
        else if (st === 'failed') f++;
        else if (st === 'blocked') b++;
        else nr++;
    });"""

app_js = app_js.replace(old_metrics_loop, new_metrics_loop)

# Update critical check in updateMetrics
old_crit_check = """    let critPass = activeScenarios.filter(sc => sc.critical).every(sc => {
        return testState.scenarios && testState.scenarios[sc.id] && testState.scenarios[sc.id].status === 'passed';
    });"""

new_crit_check = """    let critPass = activeScenarios.filter(sc => sc.critical).every(sc => {
        return siteScenariosState[sc.id] && siteScenariosState[sc.id].status === 'passed';
    });"""

app_js = app_js.replace(old_crit_check, new_crit_check)

# Update report exporter loop
old_report_loop = """    activeScenarios.forEach(sc => {
        let stateObj = (testState.scenarios && testState.scenarios[sc.id]) ? testState.scenarios[sc.id] : { status: 'notrun', notes: '' };
        let st = stateObj.status || 'notrun';
        if (st === 'passed') p++;
        else if (st === 'failed') { f++; failedList.push(`${sc.id} ${sc.name} (Note: ${stateObj.notes || 'N/A'})`); }
        else if (st === 'blocked') { b++; failedList.push(`${sc.id} ${sc.name} [BLOCKED] (Note: ${stateObj.notes || 'N/A'})`); }
        else nr++;
    });"""

new_report_loop = """    let siteKey = currentSiteKey || 'NUH';
    let siteScenariosState = (testState.scenarios && testState.scenarios[siteKey]) ? testState.scenarios[siteKey] : {};

    activeScenarios.forEach(sc => {
        let stateObj = siteScenariosState[sc.id] || { status: 'notrun', notes: '' };
        let st = stateObj.status || 'notrun';
        if (st === 'passed') p++;
        else if (st === 'failed') { f++; failedList.push(`${sc.id} ${sc.name} (Note: ${stateObj.notes || 'N/A'})`); }
        else if (st === 'blocked') { b++; failedList.push(`${sc.id} ${sc.name} [BLOCKED] (Note: ${stateObj.notes || 'N/A'})`); }
        else nr++;
    });"""

app_js = app_js.replace(old_report_loop, new_report_loop)

old_report_crit = """    let critPass = activeScenarios.filter(sc => sc.critical).every(sc => {
        return testState.scenarios && testState.scenarios[sc.id] && testState.scenarios[sc.id].status === 'passed';
    });"""

new_report_crit = """    let critPass = activeScenarios.filter(sc => sc.critical).every(sc => {
        return siteScenariosState[sc.id] && siteScenariosState[sc.id].status === 'passed';
    });"""

app_js = app_js.replace(old_report_crit, new_report_crit)

with open('./js/app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

print('Successfully updated js/app.js to enforce default Not Run status per site.')
