"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { EvidenceItem, RunEntity, ScenarioStatus } from "@/lib/types";
import { EVIDENCE_MAX_PER_SCENARIO } from "@/lib/types";
import type { ScenarioWithResult } from "@/lib/runs";
import LinearReportModal from "./LinearReportModal";

interface Props {
  site: string;
  runId: string;
  initialRun: RunEntity;
  initialScenarios: ScenarioWithResult[];
}

const STATUS_LABELS: Record<ScenarioStatus, string> = {
  passed: "🟢 Pass",
  failed: "🔴 Fail",
  blocked: "🟡 Block",
  notrun: "⚪ Not Run",
};

type FilterMode = "all" | "notrun" | "failed" | "passed";

function cleanId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function matchesFilter(status: ScenarioStatus, mode: FilterMode): boolean {
  if (mode === "all") return true;
  if (mode === "notrun") return status === "notrun";
  if (mode === "failed") return status === "failed" || status === "blocked";
  return status === "passed";
}

export default function ScenarioBoard({ site, runId, initialRun, initialScenarios }: Props) {
  const [run, setRun] = useState(initialRun);
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [, startTransition] = useTransition();
  const [showLinearReport, setShowLinearReport] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [justSavedId, setJustSavedId] = useState<string | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [showPassAllConfirm, setShowPassAllConfirm] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  async function patchScenario(scenarioId: string, body: { status?: ScenarioStatus; notes?: string }): Promise<boolean> {
    const res = await fetch(
      `/api/runs/${site}/${runId}/scenarios/${encodeURIComponent(scenarioId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`Update failed: ${err.error || res.statusText}`);
      return false;
    }
    const data = await res.json();
    setRun(data.run as RunEntity);
    return true;
  }

  function setStatus(scenarioId: string, status: ScenarioStatus) {
    setScenarios((prev) =>
      prev.map((s) => (s.id === scenarioId ? { ...s, status } : s))
    );
    startTransition(() => {
      patchScenario(scenarioId, { status });
    });
  }

  function setNotes(scenarioId: string, notes: string) {
    setScenarios((prev) => prev.map((s) => (s.id === scenarioId ? { ...s, notes } : s)));
  }

  function commitNotes(scenarioId: string, notes: string) {
    startTransition(async () => {
      const ok = await patchScenario(scenarioId, { notes });
      if (ok) {
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
        setJustSavedId(scenarioId);
        savedTimeoutRef.current = setTimeout(() => setJustSavedId(null), 2000);
      }
    });
  }

  function scrollToNextUnfinished() {
    setFilterMode("all"); // guarantee the target card is actually rendered, whatever tab was active
    const next = scenarios.find((s) => s.status === "notrun");
    if (!next) return;
    // Wait a tick for the "all" filter to re-render before scrolling, in case a narrower tab had
    // just removed this card from the DOM.
    setTimeout(() => {
      document.getElementById(`scenario-${cleanId(next.id)}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }

  async function passAllRemaining() {
    const targets = scenarios.filter((s) => s.status === "notrun");
    setShowPassAllConfirm(false);
    setBulkProgress({ done: 0, total: targets.length });
    // Sequential, not Promise.all — updateScenarioResult() in lib/runs.ts does a
    // read-all-results -> recompute-aggregate -> write-Run cycle per call. Concurrent calls would
    // each read a stale snapshot of the others' in-flight writes and race the Run's final
    // aggregate numbers. N is small (a smoke-test scenario count), so sequential is cheap enough.
    for (let i = 0; i < targets.length; i++) {
      const scenarioId = targets[i].id;
      setScenarios((prev) => prev.map((s) => (s.id === scenarioId ? { ...s, status: "passed" } : s)));
      await patchScenario(scenarioId, { status: "passed" });
      setBulkProgress({ done: i + 1, total: targets.length });
    }
    setBulkProgress(null);
  }

  function setEvidence(scenarioId: string, evidence: EvidenceItem[]) {
    setScenarios((prev) => prev.map((s) => (s.id === scenarioId ? { ...s, evidence } : s)));
  }

  async function uploadEvidence(scenarioId: string, blob: Blob) {
    const current = scenarios.find((s) => s.id === scenarioId);
    if (current && current.evidence.length >= EVIDENCE_MAX_PER_SCENARIO) {
      alert(`You can attach up to ${EVIDENCE_MAX_PER_SCENARIO} images per Scenario`);
      return;
    }
    const formData = new FormData();
    formData.append("file", blob, "evidence.png");
    const res = await fetch(
      `/api/runs/${site}/${runId}/scenarios/${encodeURIComponent(scenarioId)}/evidence`,
      { method: "POST", body: formData }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`Attach failed: ${err.error || res.statusText}`);
      return;
    }
    const data = await res.json();
    setEvidence(scenarioId, data.evidence as EvidenceItem[]);
  }

  function handleEvidenceFiles(scenarioId: string, files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((file) => uploadEvidence(scenarioId, file));
  }

  function handleEvidencePaste(event: React.ClipboardEvent, scenarioId: string) {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const blob = item.getAsFile();
        if (blob) uploadEvidence(scenarioId, blob);
      }
    }
  }

  async function removeEvidenceItem(scenarioId: string, evidenceId: string) {
    const res = await fetch(
      `/api/runs/${site}/${runId}/scenarios/${encodeURIComponent(scenarioId)}/evidence/${evidenceId}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`Delete failed: ${err.error || res.statusText}`);
      return;
    }
    const data = await res.json();
    setEvidence(scenarioId, data.evidence as EvidenceItem[]);
  }

  const total = scenarios.length;
  const notRunCount = scenarios.filter((s) => s.status === "notrun").length;
  const failedCount = scenarios.filter((s) => s.status === "failed" || s.status === "blocked").length;
  const passedCount = scenarios.filter((s) => s.status === "passed").length;
  const recordedCount = total - notRunCount;
  const visibleScenarios = scenarios.filter((s) => matchesFilter(s.status, filterMode));
  const hasUnfinished = notRunCount > 0;

  // Reset keyboard focus whenever the visible list changes shape (switching tabs), so it can
  // never point past the end of a narrower filtered list.
  useEffect(() => {
    setFocusedIndex(0);
  }, [filterMode]);

  // Keyboard shortcuts: 1/2/3 = Pass/Fail/Block on the focused card, Up/Down move focus. Ignored
  // entirely while typing in a Notes field, so e.g. "Bug 123" never triggers a status change.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (visibleScenarios.length === 0) return;

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((i) => {
          const next = e.key === "ArrowDown" ? Math.min(i + 1, visibleScenarios.length - 1) : Math.max(i - 1, 0);
          const target = visibleScenarios[next];
          if (target) {
            document.getElementById(`scenario-${cleanId(target.id)}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          return next;
        });
      } else if (e.key === "1" || e.key === "2" || e.key === "3") {
        const target = visibleScenarios[focusedIndex];
        if (!target) return;
        const status: ScenarioStatus = e.key === "1" ? "passed" : e.key === "2" ? "failed" : "blocked";
        setStatus(target.id, status);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleScenarios, focusedIndex]);

  // Macro-to-micro order: Version -> Environment -> Test Cycle -> Date. Version is dropped
  // entirely (not shown as an empty bullet) when the run has none.
  const contextSummary = [run.version, run.environment, run.testCycle, run.executedDate]
    .filter(Boolean)
    .join(" • ");

  const FILTER_TABS: { mode: FilterMode; label: string; count: number }[] = [
    { mode: "all", label: "All", count: total },
    { mode: "notrun", label: "Not Run", count: notRunCount },
    { mode: "failed", label: "Failed", count: failedCount },
    { mode: "passed", label: "Passed", count: passedCount },
  ];

  return (
    <>
      <div className="sticky-mini-bar" data-testid="smoke-runner:run-detail:mini-bar">
        <span className={`gate-badge ${run.gateResult === "READY" ? "ready" : "notready"}`}>
          {run.gateResult === "READY" ? "✅ READY" : "❌ NOT READY"}
        </span>
        <span className="mini-bar-stat">{run.passRatePercent}% Pass Rate</span>
        <span className="mini-bar-stat">{recordedCount}/{total} recorded</span>
        <div className="filter-tabs">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.mode}
              type="button"
              className={`filter-tab ${filterMode === tab.mode ? "active" : ""}`}
              onClick={() => setFilterMode(tab.mode)}
              data-testid={`smoke-runner:run-detail:filter-tab__${tab.mode}`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-sm"
          onClick={scrollToNextUnfinished}
          disabled={!hasUnfinished}
          data-testid="smoke-runner:run-detail:btn__next-unfinished"
        >
          Next Unfinished →
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setShowPassAllConfirm(true)}
          disabled={!hasUnfinished || bulkProgress !== null}
          data-testid="smoke-runner:run-detail:btn__pass-all-remaining"
        >
          {bulkProgress ? `Passing... ${bulkProgress.done}/${bulkProgress.total}` : "Pass All Remaining"}
        </button>
      </div>

      {showPassAllConfirm && (
        <div className="modal-overlay" data-testid="smoke-runner:pass-all-confirm:modal__dialog" onClick={() => setShowPassAllConfirm(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Pass All Remaining?</h3>
            </div>
            <p>
              This will mark {notRunCount} remaining Not Run scenario{notRunCount === 1 ? "" : "s"} as
              Passed. Continue?
            </p>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setShowPassAllConfirm(false)}
                data-testid="smoke-runner:pass-all-confirm:btn__cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={passAllRemaining}
                data-testid="smoke-runner:pass-all-confirm:btn__confirm"
              >
                Yes, Pass All
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div className="stat-card-row" style={{ flex: "1 1 320px" }}>
            <div className="stat-card pass">
              <div className="num">{run.passed}</div>
              <div className="label">Pass</div>
            </div>
            <div className="stat-card fail">
              <div className="num">{run.failed}</div>
              <div className="label">Fail</div>
            </div>
            <div className="stat-card block">
              <div className="num">{run.blocked}</div>
              <div className="label">Block</div>
            </div>
            <div className="stat-card notrun">
              <div className="num">{run.notrun}</div>
              <div className="label">Not Run</div>
            </div>
            <div className="stat-card">
              <div className="num">{run.passRatePercent}%</div>
              <div className="label">Pass Rate</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <span
              className={`gate-badge ${run.gateResult === "READY" ? "ready" : "notready"}`}
              data-testid="smoke-runner:run-detail:badge__gate"
            >
              {run.gateResult === "READY" ? "✅ READY" : "❌ NOT READY"}
            </span>
            {contextSummary && <span className="context-summary">{contextSummary}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn"
            onClick={() => setShowLinearReport(true)}
            data-testid="smoke-runner:run-detail:btn__open-linear-report"
          >
            Send Summary to Linear
          </button>
          <Link
            href={`/${site}/${runId}/executive-report`}
            className="btn"
            data-testid="smoke-runner:run-detail:link__executive-report"
          >
            Executive Report
          </Link>
        </div>
      </div>

      {showLinearReport && (
        <LinearReportModal run={run} scenarios={scenarios} onClose={() => setShowLinearReport(false)} />
      )}

      {visibleScenarios.map((sc, index) => {
        const id = cleanId(sc.id);
        return (
          <div
            key={sc.id}
            id={`scenario-${id}`}
            className={`scenario-item ${sc.status} ${index === focusedIndex ? "focused" : ""}`}
            data-testid={`smoke-runner:scenario-item:card__${id}`}
            onClick={() => setFocusedIndex(index)}
          >
            <div style={{ minWidth: 0 }}>
              <div className="scenario-id">
                {sc.id}
                {sc.critical && <span className="critical-badge">Critical Flow</span>}
              </div>
              <div className="scenario-name">{sc.name}</div>
              <div className="scenario-role">{sc.role}</div>
            </div>
            <div className="status-btn-group">
              {(Object.keys(STATUS_LABELS) as ScenarioStatus[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`status-btn ${sc.status === status ? "active" : ""}`}
                  data-status={status}
                  data-testid={`smoke-runner:scenario-item:btn-${status}__${id}`}
                  onClick={() => setStatus(sc.id, status)}
                >
                  {STATUS_LABELS[status]}
                </button>
              ))}
            </div>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="notes-input"
                placeholder="Notes / Bug ID (optional)..."
                value={sc.notes}
                data-testid={`smoke-runner:scenario-item:input-notes__${id}`}
                onChange={(e) => setNotes(sc.id, e.target.value)}
                onBlur={(e) => commitNotes(sc.id, e.target.value)}
              />
              <span
                className={`save-indicator ${justSavedId === sc.id ? "visible" : ""}`}
                data-testid={`smoke-runner:scenario-item:save-indicator__${id}`}
              >
                Saved ✓
              </span>
            </div>

            <div className="evidence-area">
              <div className="evidence-head">
                <span className="section-label">Evidence ({sc.evidence.length}/{EVIDENCE_MAX_PER_SCENARIO})</span>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => document.getElementById(`evidence-file-${id}`)?.click()}
                  data-testid={`smoke-runner:scenario-item:btn-attach-evidence__${id}`}
                >
                  Attach Image
                </button>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  id={`evidence-file-${id}`}
                  data-testid={`smoke-runner:scenario-item:input-evidence-file__${id}`}
                  onChange={(e) => {
                    handleEvidenceFiles(sc.id, e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>
              <div
                className="evidence-pastezone"
                tabIndex={0}
                data-testid={`smoke-runner:scenario-item:pastezone-evidence__${id}`}
                onPaste={(e) => handleEvidencePaste(e, sc.id)}
              >
                Click here and paste an image (Ctrl+V), or use the &quot;Attach Image&quot; button
              </div>
              {sc.evidence.length > 0 && (
                <div className="evidence-thumbs">
                  {sc.evidence.map((ev) => (
                    <div
                      key={ev.id}
                      className="evidence-thumb"
                      data-testid={`smoke-runner:scenario-item:evidence-thumb__${id}-${ev.id}`}
                      onClick={() => setLightbox(ev.blobName)}
                    >
                      <img src={`/api/evidence/${ev.blobName}`} alt="Evidence" />
                      <button
                        type="button"
                        className="evidence-thumb-remove"
                        title="Delete Image"
                        data-testid={`smoke-runner:scenario-item:btn-remove-evidence__${id}-${ev.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeEvidenceItem(sc.id, ev.id);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {lightbox && (
        <div
          className="lightbox-overlay"
          data-testid="smoke-runner:run-detail:modal__lightbox"
          onClick={() => setLightbox(null)}
        >
          <img
            className="lightbox-img"
            src={`/api/evidence/${lightbox}`}
            alt="Evidence full size"
            data-testid="smoke-runner:run-detail:img__lightbox"
          />
          <button
            type="button"
            className="btn btn-sm"
            style={{ position: "fixed", top: 24, right: 24 }}
            onClick={() => setLightbox(null)}
            data-testid="smoke-runner:run-detail:btn__close-lightbox"
          >
            Close
          </button>
        </div>
      )}
    </>
  );
}
