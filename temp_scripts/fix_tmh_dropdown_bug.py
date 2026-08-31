# -*- coding: utf-8 -*-
import re

html_path = './smoke_test_runner.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update loadState JS function so it syncs activeScenarios properly upon page load
old_load_state = """if (testState.metadata.site) {
                            let sel = document.getElementById('meta-site-select');
                            if (testState.metadata.site.includes('NUH')) sel.value = 'NUH';
                            else if (testState.metadata.site.includes('SBH')) sel.value = 'SBH';
                            else if (testState.metadata.site.includes('TMH')) sel.value = 'TMH';
                            else if (testState.metadata.site.includes('Siriraj')) sel.value = 'Siriraj';
                            else if (testState.metadata.site.includes('Standard')) sel.value = 'Standard';
                        }"""

new_load_state = """if (testState.metadata.site) {
                            let sel = document.getElementById('meta-site-select');
                            if (testState.metadata.site.includes('NUH')) sel.value = 'NUH';
                            else if (testState.metadata.site.includes('SBH')) sel.value = 'SBH';
                            else if (testState.metadata.site.includes('TMH')) sel.value = 'TMH';
                            else if (testState.metadata.site.includes('Siriraj')) sel.value = 'Siriraj';
                            else if (testState.metadata.site.includes('Standard')) sel.value = 'Standard';
                            else {
                                sel.value = 'Custom';
                            }
                        }
                        onSiteSelectChange();"""

html = html.replace(old_load_state, new_load_state)

# 2. Update onSiteSelectChange function cleanly
start_marker = "function onSiteSelectChange() {"
end_marker = "updateMetrics();\n        }"

start_idx = html.find(start_marker)
end_idx = html.find(end_marker, start_idx)

if start_idx != -1 and end_idx != -1:
    old_func = html[start_idx : end_idx + len(end_marker)]
    new_func = """function onSiteSelectChange() {
            let sel = document.getElementById('meta-site-select').value;
            let customGrp = document.getElementById('custom-site-group');
            let inputSite = document.getElementById('meta-site');

            let base = (siteScenarioFlows && siteScenarioFlows.NUH) ? siteScenarioFlows.NUH : scenariosData;

            if (sel === 'NUH') {
                customGrp.style.display = 'none';
                inputSite.value = 'NUH (โรงพยาบาลมหาวิทยาลัยนเรศวร)';
                activeScenarios = base.map(s => ({
                    ...s,
                    name: s.name.replace(/^[^:]+:\s*/, 'NUH: '),
                    desc: s.desc.replace(/NUH|SBH|TMH|Siriraj/g, 'NUH'),
                    role: s.role.replace(/\\([^)]+\\)/, '(NUH)'),
                    steps: s.steps.replace(/NUH|SBH|TMH|Siriraj/g, 'NUH'),
                    criteria: s.criteria.replace(/NUH|SBH|TMH|Siriraj/g, 'NUH')
                }));
            } else if (sel === 'SBH') {
                customGrp.style.display = 'none';
                inputSite.value = 'SBH (โรงพยาบาลสระบุรี)';
                activeScenarios = base.map(s => ({
                    ...s,
                    name: s.name.replace(/^[^:]+:\s*/, 'SBH: '),
                    desc: s.desc.replace(/NUH|SBH|TMH|Siriraj/g, 'SBH'),
                    role: s.role.replace(/\\([^)]+\\)/, '(SBH)'),
                    steps: s.steps.replace(/NUH|SBH|TMH|Siriraj/g, 'SBH'),
                    criteria: s.criteria.replace(/NUH|SBH|TMH|Siriraj/g, 'SBH')
                }));
            } else if (sel === 'TMH') {
                customGrp.style.display = 'none';
                inputSite.value = 'TMH (โรงพยาบาลเวชศาสตร์เขตร้อน)';
                activeScenarios = base.map(s => ({
                    ...s,
                    name: s.name.replace(/^[^:]+:\s*/, 'TMH: '),
                    desc: s.desc.replace(/NUH|SBH|TMH|Siriraj/g, 'TMH'),
                    role: s.role.replace(/\\([^)]+\\)/, '(TMH)'),
                    steps: s.steps.replace(/NUH|SBH|TMH|Siriraj/g, 'TMH'),
                    criteria: s.criteria.replace(/NUH|SBH|TMH|Siriraj/g, 'TMH')
                }));
            } else if (sel === 'Standard') {
                customGrp.style.display = 'none';
                inputSite.value = 'Standard (General Hospital)';
                activeScenarios = base.map(s => ({
                    ...s,
                    name: s.name.replace(/^[^:]+:\s*/, 'Standard: '),
                    desc: s.desc.replace(/NUH|SBH|TMH|Siriraj/g, 'Hospital'),
                    role: s.role.replace(/\\([^)]+\\)/, '(General Hospital)'),
                    steps: s.steps.replace(/NUH|SBH|TMH|Siriraj/g, 'Hospital'),
                    criteria: s.criteria.replace(/NUH|SBH|TMH|Siriraj/g, 'Hospital')
                }));
            } else {
                customGrp.style.display = 'flex';
                let customName = inputSite.value || 'Custom';
                activeScenarios = base.map(s => ({
                    ...s,
                    name: s.name.replace(/^[^:]+:\s*/, customName + ': '),
                    role: s.role.replace(/\\([^)]+\\)/, '(' + customName + ')')
                }));
            }
            
            saveMetadata();
            renderScenarios();
            updateMetrics();
        }"""
    html = html.replace(old_func, new_func)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

print('Successfully fixed TMH dropdown scenario loading bug!')
