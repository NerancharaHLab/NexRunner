"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { EvidenceItem, RunEntity, RunLockEventEntity, ScenarioStatus } from "@/lib/types";
import { EVIDENCE_MAX_PER_SCENARIO } from "@/lib/types";
import type { ScenarioWithResult } from "@/lib/runs";
import LinearReportModal from "./LinearReportModal";

interface Props {
  site: string;
  runId: string;
  initialRun: RunEntity;
  initialScenarios: ScenarioWithResult[];
  /** REQ-031 Lock/Unlock audit log, newest first. */
  initialLockEvents: RunLockEventEntity[];
  /** admin/qa_lead only — Unlock is the escalation-required side of Lock/Unlock. */
  canUnlock: boolean;
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

export default function ScenarioBoard({
  site,
  runId,
  initialRun,
  initialScenarios,
  initialLockEvents,
  canUnlock,
}: Props) {
  const [run, setRun] = useState(initialRun);
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [lockEvents, setLockEvents] = useState(initialLockEvents);
  const [, startTransition] = useTransition();
  const [showLinearReport, setShowLinearReport] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [justSavedId, setJustSavedId] = useState<string | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [showPassAllConfirm, setShowPassAllConfirm] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const [unlockReason, setUnlockReason] = useState("");
  const [lockActionPending, setLockActionPending] = useState(false);
  const [showLockHistory, setShowLockHistory] = useState(false);
  // REQ-040: which cards have their Steps/Criteria panel open — per-card, default collapsed, never
  // gated on `locked` (viewing is read-only, not an edit the lock needs to block).
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const locked = run.locked;

  function toggleExpanded(scenarioId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(scenarioId)) next.delete(scenarioId);
      else next.add(scenarioId);
      return next;
    });
  }

  /** Refetches the full Run detail after a Lock/Unlock — simpler and more accurate than
   *  fabricating a RunLockEvent client-side (the server is the source of truth for who/when). */
  async function refreshRunDetail() {
    const res = await fetch(`/api/runs/${site}/${runId}`);
    if (!res.ok) return;
    const data = await res.json();
    setRun(data.run as RunEntity);
    setLockEvents(data.lockEvents as typeof lockEvents);
  }

  async function lockRunNow() {
    setLockActionPending(true);
    const res = await fetch(`/api/runs/${site}/${runId}/lock`, { method: "POST" });
    setLockActionPending(false);
    setShowLockConfirm(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`Lock failed: ${err.error || res.statusText}`);
      return;
    }
    await refreshRunDetail();
  }

  async function unlockRunNow() {
    if (!unlockReason.trim()) return;
    setLockActionPending(true);
    const res = await fetch(`/api/runs/${site}/${runId}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: unlockReason.trim() }),
    });
    setLockActionPending(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`Unlock failed: ${err.error || res.statusText}`);
      return;
    }
    setShowUnlockConfirm(false);
    setUnlockReason("");
    await refreshRunDetail();
  }

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
    // Guarded here (not just via disabled buttons) because the 1/2/3 keyboard shortcut calls this
    // directly, bypassing any button's disabled state — see the keydown handler below.
    if (locked) return;
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
    if (locked) return;
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
    if (locked) return;
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
    if (locked) return;
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
    if (locked) return;
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
          disabled={!hasUnfinished || bulkProgress !== null || locked}
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
          {/* Rendered here (not in the parent Server Component) so it reacts live to run.locked —
              Lock/Unlock happen client-side via fetch(), and the parent page only renders once
              per page load, so a link gated there would stay frozen at whatever locked state the
              Run was in when the page first loaded. canUnlock doubles as "can edit metadata" —
              both are the same CAN_EDIT_CONTENT (admin/qa_lead) check. */}
          {canUnlock && !locked && (
            <Link
              href={`/${site}/${runId}/edit`}
              className="btn"
              data-testid="smoke-runner:run-detail:link__edit-run"
            >
              Edit Run
            </Link>
          )}
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
          {locked ? (
            <span className="gate-badge notready" data-testid="smoke-runner:run-detail:badge__locked">
              🔒 Locked by {run.lockedBy || "unknown"}
              {run.lockedAt && ` · ${new Date(run.lockedAt).toLocaleString()}`}
            </span>
          ) : (
            <button
              type="button"
              className="btn"
              onClick={() => setShowLockConfirm(true)}
              data-testid="smoke-runner:run-detail:btn__lock-run"
            >
              Lock Run
            </button>
          )}
          {locked && canUnlock && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setShowUnlockConfirm(true)}
              data-testid="smoke-runner:run-detail:btn__unlock-run"
            >
              Unlock
            </button>
          )}
          {lockEvents.length > 0 && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setShowLockHistory((v) => !v)}
              data-testid="smoke-runner:run-detail:btn__toggle-lock-history"
            >
              {showLockHistory ? "Hide" : "Show"} Lock History
            </button>
          )}
        </div>
        {showLockHistory && lockEvents.length > 0 && (
          <ul className="lock-history-list" data-testid="smoke-runner:run-detail:list__lock-history">
            {lockEvents.map((ev) => (
              <li key={ev.id}>
                <strong>{ev.action}</strong> by {ev.byEmail} · {new Date(ev.at).toLocaleString()}
                {ev.reason && <> — “{ev.reason}”</>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {showLinearReport && (
        <LinearReportModal run={run} scenarios={scenarios} onClose={() => setShowLinearReport(false)} />
      )}

      {showLockConfirm && (
        <div
          className="modal-overlay"
          data-testid="smoke-runner:lock-confirm:modal__dialog"
          onClick={() => setShowLockConfirm(false)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Lock this Run?</h3>
            </div>
            <p>
              Once locked, results, notes, evidence, and Run metadata can&apos;t be edited until an
              admin or QA Lead unlocks it. Anyone can lock a Run they&apos;ve finished testing —
              only admin/QA Lead can unlock it.
            </p>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setShowLockConfirm(false)}
                data-testid="smoke-runner:lock-confirm:btn__cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={lockRunNow}
                disabled={lockActionPending}
                data-testid="smoke-runner:lock-confirm:btn__confirm"
              >
                {lockActionPending ? "Locking..." : "Yes, Lock Run"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUnlockConfirm && (
        <div
          className="modal-overlay"
          data-testid="smoke-runner:unlock-confirm:modal__dialog"
          onClick={() => setShowUnlockConfirm(false)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Unlock this Run?</h3>
            </div>
            <p>A reason is required and will be permanently logged.</p>
            <textarea
              className="notes-input"
              style={{ width: "100%", minHeight: 80 }}
              placeholder="Why does this Run need to be unlocked?"
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              data-testid="smoke-runner:unlock-confirm:input__reason"
            />
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  setShowUnlockConfirm(false);
                  setUnlockReason("");
                }}
                data-testid="smoke-runner:unlock-confirm:btn__cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={unlockRunNow}
                disabled={lockActionPending || !unlockReason.trim()}
                data-testid="smoke-runner:unlock-confirm:btn__confirm"
              >
                {lockActionPending ? "Unlocking..." : "Yes, Unlock Run"}
              </button>
            </div>
          </div>
        </div>
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
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => toggleExpanded(sc.id)}
                data-testid={`smoke-runner:scenario-item:btn-toggle-steps__${id}`}
              >
                {expandedIds.has(sc.id) ? "▲ Hide" : "▾"} Steps &amp; Criteria
              </button>
              {expandedIds.has(sc.id) && (
                <div
                  className="scenario-expand-detail"
                  data-testid={`smoke-runner:scenario-item:detail-steps__${id}`}
                >
                  <div className="scenario-steps-box">
                    <div className="section-label">Steps</div>
                    {sc.steps}
                  </div>
                  <div className="scenario-criteria-box">
                    <div className="section-label">Criteria</div>
                    {sc.criteria}
                  </div>
                </div>
              )}
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
                  disabled={locked}
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
                readOnly={locked}
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
                  disabled={locked}
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
                        disabled={locked}
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
