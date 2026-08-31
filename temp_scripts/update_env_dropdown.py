# -*- coding: utf-8 -*-

# --- 1. Update index.html and smoke_test_runner.html ---
for filename in ['index.html', 'smoke_test_runner.html']:
    with open(f'./{filename}', 'r', encoding='utf-8') as f:
        html = f.read()

    old_env_input = """                    <div class="form-group">
                        <label>ENVIRONMENT</label>
                        <input type="text" id="meta-env" value="STAGING / UAT" onchange="saveMetadata()">
                    </div>"""

    new_env_input = """                    <div class="form-group">
                        <label>ENVIRONMENT</label>
                        <select id="meta-env-select" onchange="onEnvSelectChange()">
                            <option value="STAGING / UAT">STAGING / UAT</option>
                            <option value="DEVELOPMENT (DEV)">DEVELOPMENT (DEV)</option>
                            <option value="PRE-PROD">PRE-PROD</option>
                            <option value="PRODUCTION (PROD)">PRODUCTION (PROD)</option>
                            <option value="Custom">✏️ Custom Environment...</option>
                        </select>
                    </div>
                    <div class="form-group" id="custom-env-group" style="display: none;">
                        <label>CUSTOM ENVIRONMENT</label>
                        <input type="text" id="meta-env-custom" placeholder="ระบุ Environment..." onchange="saveMetadata()">
                    </div>
                    <input type="hidden" id="meta-env" value="STAGING / UAT">"""

    html = html.replace(old_env_input, new_env_input)

    with open(f'./{filename}', 'w', encoding='utf-8') as f:
        f.write(html)

print('Updated HTML files with Environment Dropdown & Custom input.')

# --- 2. Update js/app.js ---
with open('./js/app.js', 'r', encoding='utf-8') as f:
    js_code = f.read()

# Add onEnvSelectChange and update saveMetadata/loadState in app.js
new_js_env_logic = """
function onEnvSelectChange() {
    let sel = document.getElementById('meta-env-select').value;
    let customGrp = document.getElementById('custom-env-group');
    let hiddenEnv = document.getElementById('meta-env');
    let customInput = document.getElementById('meta-env-custom');

    if (sel === 'Custom') {
        customGrp.style.display = 'flex';
        hiddenEnv.value = customInput.value || 'Custom Environment';
    } else {
        customGrp.style.display = 'none';
        hiddenEnv.value = sel;
    }
    saveMetadata();
}
"""

if 'function onEnvSelectChange()' not in js_code:
    js_code += '\n' + new_js_env_logic

# Update saveMetadata in app.js to sync meta-env
old_save_meta = """function saveMetadata() {
    if (!testState.metadata) testState.metadata = {};
    ['siteKey', 'site', 'ver', 'delivery', 'runid', 'cycle', 'date', 'tester', 'env', 'hn', 'vn', 'an', 'bill'].forEach(k => {
        let el = document.getElementById('meta-' + k);
        if (el) testState.metadata[k] = el.value;
    });
    saveState();
}"""

new_save_meta = """function saveMetadata() {
    if (!testState.metadata) testState.metadata = {};
    
    let envSel = document.getElementById('meta-env-select');
    let hiddenEnv = document.getElementById('meta-env');
    if (envSel && hiddenEnv) {
        if (envSel.value === 'Custom') {
            hiddenEnv.value = document.getElementById('meta-env-custom').value || 'Custom Environment';
        } else {
            hiddenEnv.value = envSel.value;
        }
        testState.metadata.envKey = envSel.value;
        testState.metadata.envCustom = document.getElementById('meta-env-custom').value;
    }

    ['siteKey', 'site', 'ver', 'delivery', 'runid', 'cycle', 'date', 'tester', 'env', 'hn', 'vn', 'an', 'bill'].forEach(k => {
        let el = document.getElementById('meta-' + k);
        if (el) testState.metadata[k] = el.value;
    });
    saveState();
}"""

js_code = js_code.replace(old_save_meta, new_save_meta)

# Update loadState in app.js to restore environment
old_load_state_meta = """            if (testState.metadata) {
                for (let k in testState.metadata) {
                    let el = document.getElementById('meta-' + k);
                    if (el && testState.metadata[k]) el.value = testState.metadata[k];
                }
                if (testState.metadata.siteKey) {
                    let sel = document.getElementById('meta-site-select');
                    if (sel) sel.value = testState.metadata.siteKey;
                }
            }"""

new_load_state_meta = """            if (testState.metadata) {
                for (let k in testState.metadata) {
                    let el = document.getElementById('meta-' + k);
                    if (el && testState.metadata[k]) el.value = testState.metadata[k];
                }
                if (testState.metadata.siteKey) {
                    let sel = document.getElementById('meta-site-select');
                    if (sel) sel.value = testState.metadata.siteKey;
                }
                if (testState.metadata.envKey) {
                    let envSel = document.getElementById('meta-env-select');
                    if (envSel) envSel.value = testState.metadata.envKey;
                    if (testState.metadata.envKey === 'Custom') {
                        document.getElementById('custom-env-group').style.display = 'flex';
                        if (testState.metadata.envCustom) {
                            document.getElementById('meta-env-custom').value = testState.metadata.envCustom;
                        }
                    }
                }
            }"""

js_code = js_code.replace(old_load_state_meta, new_load_state_meta)

with open('./js/app.js', 'w', encoding='utf-8') as f:
    f.write(js_code)

print('Updated js/app.js with Environment Dropdown & Custom logic.')
