"use client";

// REQ-039: shared Scenario Picker for both the Add Suite and Edit Suite forms. Outer shell (Flow
// accordion, group-header select-all/indeterminate, search) is a real reuse of
// app/admin/useScenarioGrouping.ts (same hook CloneFromMasterList.tsx uses); each row is the new
// ScenarioExpandableRow. Server Component parent (new/page.tsx or [id]/edit/page.tsx) pre-fetches
// the Master Library + every real Site's own Custom Scenarios (small scale today, no new API route
// for a live re-fetch on Target Site change) and passes them down; changing Target Site here just
// re-filters that already-fetched pool client-side. Checkboxes keep the same real `sc_${id}` name
// contract the existing createSuiteAction/updateSuiteAction already parse — zero server action
// changes needed for scenario selection itself, only for reading the new `siteId` field this
// component also renders (a real <select name="siteId">, participates in the same outer <form> the
// parent page renders even though it's a client child of it).
import { useEffect, useMemo, useRef, useState } from "react";
import type { HospitalSiteEntry, ScenarioDef } from "@/lib/types";
import { useScenarioGrouping, type GroupBy } from "@/app/admin/useScenarioGrouping";
import ScenarioExpandableRow from "@/app/admin/scenarios/ScenarioExpandableRow";

interface Props {
  masterScenarios: ScenarioDef[];
  /** Keyed by real Site.id — each list pre-filtered to just that site's own `{SITE}-CUST-` rows
   *  (never its cloned-from-Master duplicates, which share the Master's own MST- id). */
  customScenariosBySite: Record<string, ScenarioDef[]>;
  sites: HospitalSiteEntry[];
  initialSiteId?: string | null;
  initialScenarioIds?: string[];
}

function GroupCheckbox({
  checked,
  indeterminate,
  onChange,
  testId,
}: Readonly<{ checked: boolean; indeterminate: boolean; onChange: () => void; testId: string }>) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      data-testid={testId}
    />
  );
}

function scopeLabelFor(sc: ScenarioDef): string {
  const custMarker = sc.id.indexOf("-CUST-");
  return custMarker === -1 ? "Master" : `${sc.id.slice(0, custMarker)} Custom`;
}

export default function SuiteScenarioPicker({
  masterScenarios,
  customScenariosBySite,
  sites,
  initialSiteId,
  initialScenarioIds,
}: Readonly<Props>) {
  const [targetSiteId, setTargetSiteId] = useState<string>(initialSiteId ?? "");
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("flow");
  const [selected, setSelected] = useState<Set<string>>(new Set(initialScenarioIds ?? []));

  const pool = useMemo(() => {
    const custom = targetSiteId ? customScenariosBySite[targetSiteId] ?? [] : [];
    return [...masterScenarios, ...custom];
  }, [masterScenarios, customScenariosBySite, targetSiteId]);

  const { groups, isExpanded, toggleGroup } = useScenarioGrouping(pool, groupBy, search);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroupSelection(groupScenarios: ScenarioDef[]) {
    const ids = groupScenarios.map((s) => s.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const id of ids) next.delete(id);
      } else {
        for (const id of ids) next.add(id);
      }
      return next;
    });
  }

  return (
    <div>
      <div className="field-row">
        <div>
          <label htmlFor="siteId">Target Site</label>
          <select
            id="siteId"
            name="siteId"
            value={targetSiteId}
            onChange={(e) => setTargetSiteId(e.target.value)}
            data-testid="smoke-runner:admin-suite-form:select__site"
          >
            <option value="">Global (Master Library only)</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="section-label">Scenarios in this Suite</div>

      <div className="scenario-search-bar">
        <input
          type="text"
          placeholder="Search name, step, tag, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="smoke-runner:admin-suite-form:input__search"
        />
        <label className="group-by-control">
          Group by
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            data-testid="smoke-runner:admin-suite-form:select__group-by"
          >
            <option value="flow">Flow</option>
            <option value="none">None (Flat List)</option>
          </select>
        </label>
      </div>

      {groups.length === 0 && (
        <div className="card empty-state">
          <div className="empty-icon">—</div>
          {pool.length === 0 ? "No Scenarios available to pick from yet" : "No Scenarios match your search"}
        </div>
      )}

      {groups.map((group) => {
        const expanded = isExpanded(group.key);
        const ids = group.scenarios.map((s) => s.id);
        const selectedCount = ids.filter((id) => selected.has(id)).length;
        return (
          <div key={group.key}>
            <div
              className="scenario-group-header"
              role="button"
              tabIndex={0}
              onClick={() => toggleGroup(group.key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleGroup(group.key);
                }
              }}
              data-testid={`smoke-runner:admin-suite-form:group-header__${group.key}`}
            >
              <GroupCheckbox
                checked={selectedCount === ids.length && ids.length > 0}
                indeterminate={selectedCount > 0 && selectedCount < ids.length}
                onChange={() => toggleGroupSelection(group.scenarios)}
                testId={`smoke-runner:admin-suite-form:chk-group__${group.key}`}
              />
              <span className={`chevron ${expanded ? "" : "collapsed"}`}>▼</span>
              <h3>{group.label}</h3>
              <span className="stat-pill" data-testid={`smoke-runner:admin-suite-form:text__group-count__${group.key}`}>
                {group.scenarios.length} Scenario{group.scenarios.length === 1 ? "" : "s"}
              </span>
              {group.criticalCount > 0 && <span className="stat-pill fail">{group.criticalCount} Critical</span>}
            </div>

            {expanded && (
              <div className="scenario-group-body">
                {group.scenarios.map((sc) => (
                  <ScenarioExpandableRow
                    key={sc.id}
                    scenario={sc}
                    checked={selected.has(sc.id)}
                    onToggle={() => toggleOne(sc.id)}
                    scopeLabel={scopeLabelFor(sc)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
