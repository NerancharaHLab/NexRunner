# -*- coding: utf-8 -*-

for filename in ['index.html', 'smoke_test_runner.html']:
    with open(f'./{filename}', 'r', encoding='utf-8') as f:
        html = f.read()

    # Add data-testid attributes according to datatest-id-standard skill
    html = html.replace('id="meta-site-select"', 'id="meta-site-select" data-testid="smoke-runner:data-chain:select__hospital-site"')
    html = html.replace('id="meta-site"', 'id="meta-site" data-testid="smoke-runner:data-chain:input__custom-site-name"')
    html = html.replace('id="meta-ver"', 'id="meta-ver" data-testid="smoke-runner:data-chain:input__system-version"')
    html = html.replace('id="meta-delivery"', 'id="meta-delivery" data-testid="smoke-runner:data-chain:input__delivery-batch"')
    html = html.replace('id="meta-runid"', 'id="meta-runid" data-testid="smoke-runner:data-chain:input__run-id"')
    html = html.replace('id="meta-cycle"', 'id="meta-cycle" data-testid="smoke-runner:data-chain:input__test-cycle"')
    html = html.replace('id="meta-date"', 'id="meta-date" data-testid="smoke-runner:data-chain:input__date-executed"')
    html = html.replace('id="meta-tester"', 'id="meta-tester" data-testid="smoke-runner:data-chain:input__tester-name"')
    html = html.replace('id="meta-env-select"', 'id="meta-env-select" data-testid="smoke-runner:data-chain:select__environment"')
    html = html.replace('id="meta-env-custom"', 'id="meta-env-custom" data-testid="smoke-runner:data-chain:input__custom-environment"')
    html = html.replace('id="meta-hn"', 'id="meta-hn" data-testid="smoke-runner:data-chain:input__primary-hn"')
    html = html.replace('id="meta-vn"', 'id="meta-vn" data-testid="smoke-runner:data-chain:input__primary-vn"')
    html = html.replace('id="meta-an"', 'id="meta-an" data-testid="smoke-runner:data-chain:input__primary-an"')
    html = html.replace('id="meta-bill"', 'id="meta-bill" data-testid="smoke-runner:data-chain:input__bill-no"')
    
    html = html.replace('onclick="resetAllData()"', 'data-testid="smoke-runner:header:btn__reset-all" onclick="resetAllData()"')
    html = html.replace('onclick="exportLinearReport()"', 'data-testid="smoke-runner:header:btn__export-linear" onclick="exportLinearReport()"')
    html = html.replace('id="search-input"', 'id="search-input" data-testid="smoke-runner:controls:input__search"')

    with open(f'./{filename}', 'w', encoding='utf-8') as f:
        f.write(html)

print('Successfully added standard data-testid attributes to UI elements.')
