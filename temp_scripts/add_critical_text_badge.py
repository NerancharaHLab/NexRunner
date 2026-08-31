# -*- coding: utf-8 -*-

# 1. Add .critical-badge styles to css/styles.css
with open('./css/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

critical_css = """
/* Critical Flow Text Badge */
.critical-badge {
    background: rgba(239, 68, 68, 0.2);
    color: #F87171;
    border: 1px solid rgba(239, 68, 68, 0.4);
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.72rem;
    font-weight: 700;
    margin-left: 6px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    text-transform: uppercase;
}
"""

if '.critical-badge' not in css:
    css += '\n' + critical_css

with open('./css/styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print('Updated css/styles.css with .critical-badge styling.')

# 2. Update js/app.js to render <span class="critical-badge">Critical Flow</span> instead of just '*'
with open('./js/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

old_crit_star = "${sc.id} ${sc.critical ? '<span style=\"color:#EF4444;\" title=\"Critical Scenario\">*</span>' : ''}"
new_crit_badge = "${sc.id} ${sc.critical ? '<span class=\"critical-badge\" data-testid=\"smoke-runner:scenario-item:badge-critical__' + cleanId + '\"><i class=\"fa-solid fa-triangle-exclamation\"></i> Critical Flow</span>' : ''}"

js = js.replace(old_crit_star, new_crit_badge)

with open('./js/app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print('Updated js/app.js to render explicit Critical Flow text badges.')
