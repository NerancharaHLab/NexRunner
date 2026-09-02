"use client";

// REQ-039: genuinely new UI (see specs/REQ-039_suite_management_enhancements.md's Context — a
// first-draft SRS claimed a Steps/Criteria expandable card already existed on the Run page to
// reuse; grep confirmed steps/criteria are never rendered anywhere in this app). Shared between
// the Add Suite and Edit Suite Scenario Pickers (app/admin/suites/SuiteScenarioPicker.tsx) — same
// fixed "scenario-picker" data-testid component name from both call sites, since it's the same
// component either way.
import { useState } from "react";
import type { ScenarioDef } from "@/lib/types";

interface Props {
  scenario: ScenarioDef;
  checked: boolean;
  onToggle: () => void;
  scopeLabel: string; // "Master" or "{SITE} Custom"
}

function cleanId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "");
}

export default function ScenarioExpandableRow({ scenario, checked, onToggle, scopeLabel }: Readonly<Props>) {
  const [expanded, setExpanded] = useState(false);
  const id = cleanId(scenario.id);
  const inputId = `sc_${scenario.id}`;

  return (
    <div
      className="card scenario-expandable-row"
      data-testid={`smoke-runner:scenario-picker:row__${id}`}
    >
      <div className="scenario-row-main">
        <input
          type="checkbox"
          id={inputId}
          name={inputId}
          checked={checked}
          onChange={onToggle}
          data-testid={`smoke-runner:scenario-picker:chk__${id}`}
        />
        <label htmlFor={inputId} className="scenario-row-label">
          <strong>{scenario.id}</strong>
          <span className="tag-pill" style={{ marginLeft: 8 }} data-testid={`smoke-runner:scenario-picker:badge-scope__${id}`}>
            {scopeLabel}
          </span>
          {scenario.critical && <span className="critical-badge">Critical Flow</span>}
          <div>{scenario.name}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            {scenario.flow} · {scenario.role}
          </div>
        </label>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setExpanded((e) => !e)}
          data-testid={`smoke-runner:scenario-picker:btn-toggle__${id}`}
        >
          {expanded ? "▲ Hide" : "▾ View"} Steps &amp; Criteria
        </button>
      </div>

      {expanded && (
        <div className="scenario-expand-detail" data-testid={`smoke-runner:scenario-picker:detail__${id}`}>
          <div className="scenario-steps-box">
            <div className="section-label">Steps</div>
            {scenario.steps}
          </div>
          <div className="scenario-criteria-box">
            <div className="section-label">Criteria</div>
            {scenario.criteria}
          </div>
        </div>
      )}
    </div>
  );
}
