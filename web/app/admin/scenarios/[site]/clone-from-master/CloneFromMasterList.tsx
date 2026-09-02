"use client";

// Clone-from-Master gets the full set: Search/Group/Accordion (shared with the Master Library via
// ../../../useScenarioGrouping.ts) plus group-header batch-select checkboxes and a Floating Action
// Bar wired to the existing per-scenario clone_{id} checkbox contract — the Server Action itself
// (cloneAction, passed down as a prop) needs zero changes.
import { useEffect, useRef, useState } from "react";
import type { ScenarioDef } from "@/lib/types";
import { useScenarioGrouping, type GroupBy } from "@/app/admin/useScenarioGrouping";

interface Props {
  scenarios: ScenarioDef[];
  existingIds: Set<string>;
  sourceFilterActive: boolean;
  siteName: string;
  cloneAction: (formData: FormData) => void | Promise<void>;
}

function cleanId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "");
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

export default function CloneFromMasterList({ scenarios, existingIds, sourceFilterActive, siteName, cloneAction }: Readonly<Props>) {
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("flow");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { groups, isExpanded, toggleGroup } = useScenarioGrouping(scenarios, groupBy, search);

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
    <form action={cloneAction}>
      <div className="scenario-search-bar">
        <input
          type="text"
          placeholder="Search name, step, tag, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="smoke-runner:clone-from-master:input__search"
        />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          Group by
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            data-testid="smoke-runner:clone-from-master:select__group-by"
          >
            <option value="flow">Flow</option>
            <option value="sourceSite" disabled={sourceFilterActive}>
              Source Site
            </option>
            <option value="none">None (Flat List)</option>
          </select>
        </label>
      </div>

      {groups.length === 0 && (
        <div className="card empty-state">
          <div className="empty-icon">—</div>
          {scenarios.length === 0 ? "No Scenarios in the Master Library yet" : "No Scenarios match your search"}
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
              data-testid={`smoke-runner:clone-from-master:group-header__${group.key}`}
            >
              <GroupCheckbox
                checked={selectedCount === ids.length && ids.length > 0}
                indeterminate={selectedCount > 0 && selectedCount < ids.length}
                onChange={() => toggleGroupSelection(group.scenarios)}
                testId={`smoke-runner:clone-from-master:chk-group__${group.key}`}
              />
              <span className={`chevron ${expanded ? "" : "collapsed"}`}>▼</span>
              <h3>
                {group.icon && `${group.icon} `}
                {group.label}
              </h3>
              <span className="stat-pill" data-testid={`smoke-runner:clone-from-master:text__group-count__${group.key}`}>
                {group.scenarios.length} Scenario{group.scenarios.length === 1 ? "" : "s"}
              </span>
              {group.criticalCount > 0 && <span className="stat-pill fail">{group.criticalCount} Critical</span>}
            </div>

            {expanded && (
              <div className="scenario-group-body">
                {group.scenarios.map((sc) => {
                  const id = cleanId(sc.id);
                  const alreadyExists = existingIds.has(sc.id);
                  return (
                    <label
                      key={sc.id}
                      className="checkbox-row card"
                      style={{ display: "flex", alignItems: "flex-start", width: "100%" }}
                      htmlFor={`clone_${sc.id}`}
                    >
                      <input
                        type="checkbox"
                        id={`clone_${sc.id}`}
                        name={`clone_${sc.id}`}
                        checked={selected.has(sc.id)}
                        onChange={() => toggleOne(sc.id)}
                        data-testid={`smoke-runner:clone-from-master:chk__${id}`}
                      />
                      <div>
                        <div>
                          <strong>{sc.id}</strong>
                          {sc.critical && <span className="critical-badge">Critical Flow</span>}
                          <span className="tag-pill" style={{ marginLeft: 8 }} data-testid={`smoke-runner:clone-from-master:badge-source__${id}`}>
                            {sc.sourceSite}
                          </span>
                          {alreadyExists && <span className="stat-pill block" style={{ marginLeft: 8 }}>Already exists — will overwrite</span>}
                        </div>
                        <div>{sc.name}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                          {sc.flow} · {sc.role}
                        </div>
                        {sc.tags && sc.tags.length > 0 && (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                            {sc.tags.map((t) => (
                              <span key={t} className="tag-pill" data-testid={`smoke-runner:clone-from-master:badge-tag__${id}__${t}`}>
                                🏷️ {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {selected.size > 0 && (
        <div className="floating-action-bar" data-testid="smoke-runner:clone-from-master:bar__floating">
          <span data-testid="smoke-runner:clone-from-master:text__selected-count">
            {selected.size} Scenario{selected.size === 1 ? "" : "s"} Selected
          </span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setSelected(new Set())}
            data-testid="smoke-runner:clone-from-master:btn__deselect-all"
          >
            Deselect All
          </button>
          <button type="submit" className="btn btn-primary btn-sm" data-testid="smoke-runner:clone-from-master:btn__clone">
            Clone to {siteName} →
          </button>
        </div>
      )}
    </form>
  );
}
