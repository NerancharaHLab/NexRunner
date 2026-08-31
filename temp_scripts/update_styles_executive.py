# -*- coding: utf-8 -*-

with open('./css/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

exec_styles = """
/* Executive Report Modal & Print Styles */
.btn-executive {
    background: linear-gradient(135deg, #10B981, #059669);
    color: white;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
}
.btn-executive:hover {
    background: linear-gradient(135deg, #059669, #047857);
}

.executive-modal-box {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    width: 95%;
    max-width: 920px;
    max-height: 90vh;
    overflow-y: auto;
    padding: 32px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    color: var(--text-primary);
}

.exec-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid var(--accent-color);
    padding-bottom: 20px;
    margin-bottom: 24px;
}

.exec-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    margin-bottom: 24px;
}

.exec-kpi-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--border-color);
    padding: 16px;
    border-radius: 10px;
    text-align: center;
}

.exec-kpi-card .num {
    font-size: 1.8rem;
    font-weight: 800;
    margin-bottom: 4px;
}

.exec-kpi-card .label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
}

.exec-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 24px;
    font-size: 0.88rem;
}

.exec-table th, .exec-table td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
}

.exec-table th {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-primary);
    font-weight: 700;
}

.exec-sig-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
    margin-top: 36px;
}

.exec-sig-box {
    border: 1px dashed var(--border-color);
    border-radius: 10px;
    padding: 20px;
    text-align: center;
    background: rgba(255, 255, 255, 0.02);
}

.exec-sig-line {
    border-bottom: 1px dashed var(--text-secondary);
    margin: 36px 20px 10px 20px;
}

@media print {
    body { background: white !important; color: black !important; }
    .container, header, .dashboard-grid, .controls-bar, .scenarios-list, .modal-overlay { display: none !important; }
}
"""

if '.btn-executive' not in css:
    css += '\n' + exec_styles

with open('./css/styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print('Updated css/styles.css with Executive Report Modal styling.')
