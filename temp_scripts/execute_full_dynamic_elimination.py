# -*- coding: utf-8 -*-
import json

# --- 1. Update scenarios/sites.json ---
sites_config = {
    "hospitals": [
        { "id": "NUH", "name": "🏥 NUH (โรงพยาบาลมหาวิทยาลัยนเรศวร)", "file": "nuh.json" },
        { "id": "SBH", "name": "🏥 SBH (โรงพยาบาลสระบุรี)", "file": "sbh.json" },
        { "id": "TMH", "name": "🏥 TMH (โรงพยาบาลเวชศาสตร์เขตร้อน)", "file": "tmh.json" },
        { "id": "Siriraj", "name": "🏥 Siriraj Hospital (รพ.ศิริราช)", "file": "siriraj.json" },
        { "id": "Standard", "name": "🏥 Standard (General Hospital)", "file": "standard.json" }
    ],
    "environments": [
        "STAGING",
        "UAT",
        "DEVELOPMENT (DEV)",
        "PRE-PROD",
        "PRODUCTION (PROD)"
    ],
    "dataChainFields": [
        { "id": "ver", "label": "SYSTEM VERSION", "type": "text", "default": "v1.0.0", "span": 1 },
        { "id": "delivery", "label": "DELIVERY BATCH (งวดส่งงาน)", "type": "text", "default": "D 1", "span": 1 },
        { "id": "runid", "label": "RUN ID", "type": "text", "default": "SM-RUN-001", "span": 1 },
        { "id": "cycle", "label": "TEST CYCLE", "type": "text", "default": "Cycle 1", "span": 1 },
        { "id": "date", "label": "DATE EXECUTED", "type": "date", "default": "today", "span": 1 },
        { "id": "tester", "label": "TESTER NAME", "type": "text", "placeholder": "ชื่อผู้ทดสอบ...", "span": 1 },
        { "id": "hn", "label": "PRIMARY HN", "type": "text", "placeholder": "HN......", "span": 1 },
        { "id": "vn", "label": "PRIMARY VN", "type": "text", "placeholder": "VN......", "span": 1 },
        { "id": "an", "label": "PRIMARY AN", "type": "text", "placeholder": "AN......", "span": 1 },
        { "id": "bill", "label": "BILL NO. / INV", "type": "text", "placeholder": "INV......", "span": 1 }
    ]
}

with open('./scenarios/sites.json', 'w', encoding='utf-8') as f:
    json.dump(sites_config, f, ensure_ascii=False, indent=2)

print('Updated ./scenarios/sites.json with dataChainFields schema.')
