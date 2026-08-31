# -*- coding: utf-8 -*-
import json

# 1. Create scenarios/sites.json registry
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
    ]
}

with open('./scenarios/sites.json', 'w', encoding='utf-8') as f:
    json.dump(sites_config, f, ensure_ascii=False, indent=2)

print('Created ./scenarios/sites.json registry file.')
