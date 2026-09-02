"use client";

// Master Scenario Library: view/discovery only (Search, Group by, Accordion, Tag badges) — no
// checkboxes/Floating Bar here, that's Clone-from-Master's job (this page is per-row CRUD, not a
// bulk action surface). See ../useScenarioGrouping.ts for the shared grouping/search logic.
import Link from "next/link";
import { useState } from "react";
import type { ScenarioDef } from "@/lib/types";
import { useScenarioGrouping, type GroupBy } from "@/app/admin/useScenarioGrouping";

interface Props {
  scenarios: ScenarioDef[];
  /** True when the page is already scoped to one Source Site via the existing ?source= filter
   *  (REQ-036) — in that state "Group by: Source Site" would only ever produce one redundant
   *  group, so that option is disabled rather than silently reverting the dropdown. */
  sourceFilterActive: boolean;
  deleteScenarioAction: (formData: FormData) => void | Promise<void>;
}

function cleanId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "");
}

export default function MasterScenarioLibraryList({ scenarios, sourceFilterActive, deleteScenarioAction }: Readonly<Props>) {
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("flow");
  const { groups, isExpanded, toggleGroup } = useScenarioGrouping(scenarios, groupBy, search);

  return (
    <div>
      <div className="scenario-search-bar">
        <input
          type="text"
          placeholder="Search name, step, tag, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="smoke-runner:admin-master-scenarios:input__search"
        />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          Group by
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            data-testid="smoke-runner:admin-master-scenarios:select__group-by"
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
              data-testid={`smoke-runner:admin-master-scenarios:group-header__${group.key}`}
            >
              <span className={`chevron ${expanded ? "" : "collapsed"}`}>▼</span>
              <h3>
                {group.icon && `${group.icon} `}
                {group.label}
              </h3>
              <span className="stat-pill" data-testid={`smoke-runner:admin-master-scenarios:text__group-count__${group.key}`}>
                {group.scenarios.length} Scenario{group.scenarios.length === 1 ? "" : "s"}
              </span>
              {group.criticalCount > 0 && <span className="stat-pill fail">{group.criticalCount} Critical</span>}
            </div>

            {expanded && (
              <div className="scenario-group-body">
                {group.scenarios.map((sc) => {
                  const id = cleanId(sc.id);
                  return (
                    <div key={sc.id} className="card" data-testid={`smoke-runner:admin-master-scenarios:row__${id}`}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <strong>{sc.id}</strong>
                          {sc.critical && <span className="critical-badge">Critical Flow</span>}
                          <span className="tag-pill" style={{ marginLeft: 8 }} data-testid={`smoke-runner:admin-master-scenarios:badge-source__${id}`}>
                            {sc.sourceSite}
                          </span>
                          <div>{sc.name}</div>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                            {sc.flow} · {sc.role}
                          </div>
                          {sc.tags && sc.tags.length > 0 && (
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                              {sc.tags.map((t) => (
                                <span key={t} className="tag-pill" data-testid={`smoke-runner:admin-master-scenarios:badge-tag__${id}__${t}`}>
                                  🏷️ {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <Link
                            href={`/admin/master-scenarios/${encodeURIComponent(sc.id)}/edit`}
                            className="btn"
                            data-testid={`smoke-runner:admin-master-scenarios:btn-edit__${id}`}
                          >
                            Edit
                          </Link>
                          <form action={deleteScenarioAction}>
                            <input type="hidden" name="scenarioId" value={sc.id} />
                            <button type="submit" className="btn btn-danger-text" data-testid={`smoke-runner:admin-master-scenarios:btn-delete__${id}`}>
                              Delete
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
