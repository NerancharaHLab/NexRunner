# -*- coding: utf-8 -*-

for filename in ['index.html', 'smoke_test_runner.html']:
    with open(f'./{filename}', 'r', encoding='utf-8') as f:
        html = f.read()

    # Replace hardcoded hospital select options with dynamic container
    old_site_select = """<select id="meta-site-select" data-testid="smoke-runner:data-chain:select__hospital-site" onchange="onSiteSelectChange()">
                            <option value="NUH">🏥 NUH (โรงพยาบาลมหาวิทยาลัยนเรศวร)</option>
                            <option value="SBH">🏥 SBH (โรงพยาบาลสระบุรี)</option>
                            <option value="TMH">🏥 TMH (โรงพยาบาลเวชศาสตร์เขตร้อน)</option>
                            <option value="Siriraj">🏥 Siriraj Hospital (รพ.ศิริราช)</option>
                            <option value="Standard">🏥 Standard (General Hospital)</option>
                            <option value="Custom">✏️ Custom Hospital Site Flow...</option>
                        </select>"""

    new_site_select = '<select id="meta-site-select" data-testid="smoke-runner:data-chain:select__hospital-site" onchange="onSiteSelectChange()"></select>'
    html = html.replace(old_site_select, new_site_select)

    # Replace hardcoded env select options with dynamic container
    old_env_select = """<select id="meta-env-select" data-testid="smoke-runner:data-chain:select__environment" onchange="onEnvSelectChange()">
                            <option value="STAGING">STAGING</option>
                            <option value="UAT">UAT</option>
                            <option value="DEVELOPMENT (DEV)">DEVELOPMENT (DEV)</option>
                            <option value="PRE-PROD">PRE-PROD</option>
                            <option value="PRODUCTION (PROD)">PRODUCTION (PROD)</option>
                            <option value="Custom">✏️ Custom Environment...</option>
                        </select>"""

    new_env_select = '<select id="meta-env-select" data-testid="smoke-runner:data-chain:select__environment" onchange="onEnvSelectChange()"></select>'
    html = html.replace(old_env_select, new_env_select)

    # Replace hardcoded filter buttons with dynamic container
    old_filter_btns = """<div class="filter-buttons">
                <button class="filter-btn active" onclick="filterCategory('all', this)">ทั้งหมด (17)</button>
                <button class="filter-btn" onclick="filterCategory('OPD', this)">OPD Flow (4)</button>
                <button class="filter-btn" onclick="filterCategory('IPD', this)">IPD Flow (11)</button>
                <button class="filter-btn" onclick="filterCategory('General', this)">General (2)</button>
            </div>"""

    new_filter_btns = '<div class="filter-buttons" id="filter-buttons-container"></div>'
    html = html.replace(old_filter_btns, new_filter_btns)

    with open(f'./{filename}', 'w', encoding='utf-8') as f:
        f.write(html)

print('Successfully updated HTML files with clean dynamic container elements.')
