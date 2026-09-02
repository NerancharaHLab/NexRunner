"use client";

// REQ-039: search + Filter-by-Site + Site badge + soft delete-guard confirm modal for the Manage
// Suites list. Same "Server Component fetches, Client Component does search/filter locally"
// split as REQ-025's RunHistoryList / REQ-038's MasterScenarioLibraryList; the delete confirm
// modal itself mirrors TagsTable.tsx's confirmTarget/.modal-overlay/.modal-card pattern, except
// (REQ-039 Decision #4) deletion here is never actually blocked — an in-use Suite just gets a
// stronger .warning-banner instead of the plain confirm wording, and Delete stays available either
// way (a Run's own scenario snapshot, REQ-030/031, is already independent of the Suite's existence).
import { useMemo, useState } from "react";
import Link from "next/link";
import type { HospitalSiteEntry } from "@/lib/types";

export interface SuiteRow {
  id: string;
  name: string;
  description: string;
  siteId: string | null;
  siteLabel: string; // "Global" or the resolved Site name
  scenarioCount: number;
  criticalCount: number;
  flowBreakdown: string; // precomputed, e.g. "OPD 3 · IPD 2 · General 1"
  usageCount: number;
}

const GLOBAL_FILTER = "__global__";

interface Props {
  suites: SuiteRow[];
  sites: HospitalSiteEntry[];
  deleteAction: (formData: FormData) => void;
}

export default function SuitesList({ suites, sites, deleteAction }: Readonly<Props>) {
  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<SuiteRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suites.filter((s) => {
      if (siteFilter === GLOBAL_FILTER && s.siteId !== null) return false;
      if (siteFilter && siteFilter !== GLOBAL_FILTER && s.siteId !== siteFilter) return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
    });
  }, [suites, search, siteFilter]);

  return (
    <div>
      <div className="scenario-search-bar">
        <input
          type="text"
          placeholder="Search Suite name or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="smoke-runner:admin-suites:input__search"
        />
        <label className="group-by-control">
          Site
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            data-testid="smoke-runner:admin-suites:select__site-filter"
          >
            <option value="">All Sites</option>
            <option value={GLOBAL_FILTER}>Global</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 && (
        <div className="card empty-state">
          <div className="empty-icon">—</div>
          {suites.length === 0 ? "No Suites yet" : "No Suites match your search/filter"}
        </div>
      )}

      {filtered.map((suite) => (
        <div
          key={suite.id}
          className="card"
          data-testid={`smoke-runner:admin-suites:row__${suite.id.replace(/[^a-zA-Z0-9]/g, "")}`}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong>{suite.name}</strong>
              <span
                className="tag-pill"
                style={{ marginLeft: 8 }}
                data-testid={`smoke-runner:admin-suites:badge-site__${suite.id.replace(/[^a-zA-Z0-9]/g, "")}`}
              >
                {suite.siteLabel}
              </span>
              <span className="stat-pill" style={{ marginLeft: 8 }}>
                {suite.scenarioCount} Scenario{suite.scenarioCount === 1 ? "" : "s"}
              </span>
              {suite.criticalCount > 0 && <span className="stat-pill fail">{suite.criticalCount} Critical</span>}
              {suite.flowBreakdown && (
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 4 }}>{suite.flowBreakdown}</div>
              )}
              {suite.description && (
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 4 }}>{suite.description}</div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Link
                href={`/admin/suites/${encodeURIComponent(suite.id)}/edit`}
                className="btn"
                data-testid={`smoke-runner:admin-suites:btn-edit__${suite.id.replace(/[^a-zA-Z0-9]/g, "")}`}
              >
                Edit
              </Link>
              <button
                type="button"
                className="btn btn-danger-text"
                onClick={() => setConfirmTarget(suite)}
                data-testid={`smoke-runner:admin-suites:btn-delete__${suite.id.replace(/[^a-zA-Z0-9]/g, "")}`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}

      {confirmTarget && (
        <div
          className="modal-overlay"
          data-testid="smoke-runner:admin-suites:modal__delete-confirm"
          onClick={() => setConfirmTarget(null)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Suite?</h3>
            </div>
            {confirmTarget.usageCount > 0 ? (
              <div className="warning-banner" data-testid="smoke-runner:admin-suites:text__usage-warning">
                This Suite is referenced by {confirmTarget.usageCount} existing Run
                {confirmTarget.usageCount === 1 ? "" : "s"}. Deleting it won&apos;t change those Runs — each Run
                already keeps its own frozen snapshot — but the Suite itself will no longer be selectable.
              </div>
            ) : (
              <p>
                Delete the Suite <strong>{confirmTarget.name}</strong>? This cannot be undone.
              </p>
            )}
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setConfirmTarget(null)}
                data-testid="smoke-runner:admin-suites:btn__cancel-delete"
              >
                Cancel
              </button>
              <form action={deleteAction}>
                <input type="hidden" name="suiteId" value={confirmTarget.id} />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  data-testid="smoke-runner:admin-suites:btn__confirm-delete"
                >
                  Yes, Delete
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
