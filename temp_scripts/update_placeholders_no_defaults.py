# -*- coding: utf-8 -*-
import json

# 1. Update scenarios/sites.json schema to use informative placeholders instead of default values
with open('./scenarios/sites.json', 'r', encoding='utf-8') as f:
    sites_config = json.load(f)

sites_config['dataChainFields'] = [
    { "id": "ver", "label": "SYSTEM VERSION", "type": "text", "placeholder": "เช่น v1.0.0", "span": 1 },
    { "id": "delivery", "label": "DELIVERY BATCH (งวดส่งงาน)", "type": "text", "placeholder": "เช่น D 1 หรือ งวดที่ 1", "span": 1 },
    { "id": "runid", "label": "RUN ID", "type": "text", "placeholder": "เช่น SM-RUN-001", "span": 1 },
    { "id": "cycle", "label": "TEST CYCLE", "type": "text", "placeholder": "เช่น Cycle 1", "span": 1 },
    { "id": "date", "label": "DATE EXECUTED", "type": "date", "span": 1 },
    { "id": "tester", "label": "TESTER NAME", "type": "text", "placeholder": "ระบุชื่อผู้ทดสอบ...", "span": 1 },
    { "id": "hn", "label": "PRIMARY HN", "type": "text", "placeholder": "เช่น HN 6600001...", "span": 1 },
    { "id": "vn", "label": "PRIMARY VN", "type": "text", "placeholder": "เช่น VN 6600001...", "span": 1 },
    { "id": "an", "label": "PRIMARY AN", "type": "text", "placeholder": "เช่น AN 6600001...", "span": 1 },
    { "id": "bill", "label": "BILL NO. / INV", "type": "text", "placeholder": "เช่น INV-660001...", "span": 1 }
]

with open('./scenarios/sites.json', 'w', encoding='utf-8') as f:
    json.dump(sites_config, f, ensure_ascii=False, indent=2)

print('Updated ./scenarios/sites.json schema with watermark placeholders.')

# 2. Update js/app.js EMBEDDED_SITES_CONFIG and renderDataChainFields
with open('./js/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# Replace EMBEDDED_SITES_CONFIG block in app.js
embedded_sites_str = f"const EMBEDDED_SITES_CONFIG = {json.dumps(sites_config, ensure_ascii=False, indent=2)};"

start_mark = "const EMBEDDED_SITES_CONFIG ="
end_mark = "const EMBEDDED_SCENARIOS ="

start_idx = app_js.find(start_mark)
end_idx = app_js.find(end_mark, start_idx)

if start_idx != -1 and end_idx != -1:
    app_js = app_js[:start_idx] + embedded_sites_str + "\n\n" + app_js[end_idx:]

# Update renderDataChainFields logic so it only sets value if saved in testState.metadata
old_render_fields = """        // Restore saved value or set default
        if (testState.metadata && testState.metadata[field.id]) {
            input.value = testState.metadata[field.id];
        } else if (field.default === 'today') {
            input.valueAsDate = new Date();
        } else if (field.default) {
            input.value = field.default;
        }"""

new_render_fields = """        // Restore saved value if available (no hardcoded default values)
        if (testState.metadata && testState.metadata[field.id]) {
            input.value = testState.metadata[field.id];
        }"""

app_js = app_js.replace(old_render_fields, new_render_fields)

# Remove DOMContentLoaded hardcoded date setter
old_date_init = """document.addEventListener('DOMContentLoaded', async () => {
    let dateEl = document.getElementById('meta-date');
    if (dateEl && !dateEl.value) {
        dateEl.valueAsDate = new Date();
    }
    
    loadState();
    await loadAppConfig();
});"""

new_date_init = """document.addEventListener('DOMContentLoaded', async () => {
    loadState();
    await loadAppConfig();
});"""

app_js = app_js.replace(old_date_init, new_date_init)

with open('./js/app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

print('Updated js/app.js to remove default values and rely purely on watermark placeholders.')
