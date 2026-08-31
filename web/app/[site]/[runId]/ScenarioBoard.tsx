"use client";

import { useState, useTransition } from "react";
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

function cleanId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

export default function ScenarioBoard({ site, runId, initialRun, initialScenarios }: Props) {
  const [run, setRun] = useState(initialRun);
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [, startTransition] = useTransition();
  const [showLinearReport, setShowLinearReport] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  async function patchScenario(scenarioId: string, body: { status?: ScenarioStatus; notes?: string }) {
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
      return;
    }
    const data = await res.json();
    setRun(data.run as RunEntity);
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
    startTransition(() => {
      patchScenario(scenarioId, { notes });
    });
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

  return (
    <>
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
          <span
            className={`gate-badge ${run.gateResult === "READY" ? "ready" : "notready"}`}
            data-testid="smoke-runner:run-detail:badge__gate"
          >
            {run.gateResult === "READY" ? "✅ READY FOR UAT" : "❌ NOT READY FOR UAT"}
          </span>
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

      {scenarios.map((sc) => {
        const id = cleanId(sc.id);
        return (
          <div key={sc.id} className={`scenario-item ${sc.status}`} data-testid={`smoke-runner:scenario-item:card__${id}`}>
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
            <input
              type="text"
              className="notes-input"
              placeholder="Notes / Bug ID (optional)..."
              value={sc.notes}
              data-testid={`smoke-runner:scenario-item:input-notes__${id}`}
              onChange={(e) => setNotes(sc.id, e.target.value)}
              onBlur={(e) => commitNotes(sc.id, e.target.value)}
            />

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
