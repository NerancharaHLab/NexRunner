# -*- coding: utf-8 -*-

with open('./js/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace button HTML generation in app.js
old_btns = """<button class="status-btn btn-pass ${st === 'passed' ? 'active' : ''}" data-status="passed" onclick="setStatus('${sc.id}', 'passed')">🟢 Pass</button>
                    <button class="status-btn btn-fail ${st === 'failed' ? 'active' : ''}" data-status="failed" onclick="setStatus('${sc.id}', 'failed')">🔴 Fail</button>
                    <button class="status-btn btn-block ${st === 'blocked' ? 'active' : ''}" data-status="blocked" onclick="setStatus('${sc.id}', 'blocked')">🟡 Block</button>
                    <button class="status-btn btn-notrun ${st === 'notrun' ? 'active' : ''}" data-status="notrun" onclick="setStatus('${sc.id}', 'notrun')">⚪ Not Run</button>"""

new_btns = """<button class="status-btn btn-pass ${st === 'passed' ? 'active' : ''}" data-status="passed" data-testid="smoke-runner:scenario-item:btn-pass__${cleanId}" onclick="setStatus('${sc.id}', 'passed')">🟢 Pass</button>
                    <button class="status-btn btn-fail ${st === 'failed' ? 'active' : ''}" data-status="failed" data-testid="smoke-runner:scenario-item:btn-fail__${cleanId}" onclick="setStatus('${sc.id}', 'failed')">🔴 Fail</button>
                    <button class="status-btn btn-block ${st === 'blocked' ? 'active' : ''}" data-status="blocked" data-testid="smoke-runner:scenario-item:btn-block__${cleanId}" onclick="setStatus('${sc.id}', 'blocked')">🟡 Block</button>
                    <button class="status-btn btn-notrun ${st === 'notrun' ? 'active' : ''}" data-status="notrun" data-testid="smoke-runner:scenario-item:btn-notrun__${cleanId}" onclick="setStatus('${sc.id}', 'notrun')">⚪ Not Run</button>"""

js = js.replace(old_btns, new_btns)

old_notes = '<input type="text" placeholder="หมายเหตุ / เลข Bug ID (ถ้ามี)..." value="${notesVal}" onchange="setNotes(\'${sc.id}\', this.value)">'
new_notes = '<input type="text" data-testid="smoke-runner:scenario-item:input-notes__${cleanId}" placeholder="หมายเหตุ / เลข Bug ID (ถ้ามี)..." value="${notesVal}" onchange="setNotes(\'${sc.id}\', this.value)">'

js = js.replace(old_notes, new_notes)

with open('./js/app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print('Successfully added data-testid to dynamic JS scenario items.')
