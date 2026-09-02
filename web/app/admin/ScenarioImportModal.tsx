"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  confirmScenarioImportAction,
  previewScenarioImportAction,
  type ScenarioImportPreviewResult,
} from "@/lib/actions/scenario-import-actions";
import type { ScenarioImportTarget } from "@/lib/scenario-import";

interface Props {
  target: ScenarioImportTarget;
  /** Where to redirect back to (with ?imported=... appended) after a successful commit — the
   *  page rendering the trigger button, so its own success-banner-reading code picks it up. */
  returnPath: string;
  /** Each caller page keeps its own data-testid naming convention for the trigger button (the
   *  modal internals share one "scenario-import" component name below, since that UI is shared). */
  triggerTestId: string;
}

type Phase = "closed" | "picking" | "previewing" | "preview" | "committing";

/**
 * REQ-022 Phase 2 — shared between the Master Scenario Library and Site Custom Scenario admin
 * pages (only the `target`/`returnPath` differ), so the upload/preview/commit UI exists in exactly
 * one place. The trigger button itself lives in each caller page (not here), so each page keeps
 * its own data-testid naming convention for it — this component only owns the modal.
 */
export default function ScenarioImportModal({ target, returnPath, triggerTestId }: Readonly<Props>) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("closed");
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<ScenarioImportPreviewResult | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function open() {
    setPhase("picking");
    setPreview(null);
    setCommitError(null);
  }

  function close() {
    setPhase("closed");
    setPreview(null);
    setCommitError(null);
  }

  async function handleFile(file: File) {
    setPhase("previewing");
    const formData = new FormData();
    formData.append("file", file);
    const result = await previewScenarioImportAction(target, formData);
    setPreview(result);
    setPhase("preview");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function handleConfirm() {
    if (!preview || preview.validRows.length === 0) return;
    setPhase("committing");
    setCommitError(null);
    try {
      const { createdIds } = await confirmScenarioImportAction(target, preview.validRows);
      const firstId = createdIds[0];
      const lastId = createdIds[createdIds.length - 1];
      close();
      router.push(
        `${returnPath}?imported=${createdIds.length}&firstId=${encodeURIComponent(firstId)}&lastId=${encodeURIComponent(lastId)}`
      );
    } catch (err) {
      setCommitError(err instanceof Error ? err.message : "Import failed");
      setPhase("preview");
    }
  }

  return (
    <>
      <button type="button" className="btn" onClick={open} data-testid={triggerTestId}>
        Import CSV
      </button>

      {phase !== "closed" && (
        <div className="modal-overlay" data-testid="smoke-runner:scenario-import:modal__dialog" onClick={close}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3>Import Scenarios</h3>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 12 }}>
              <a
                href="/scenario_import_template.csv"
                download
                className="text-link"
                data-testid="smoke-runner:scenario-import:btn__download-template"
              >
                Download the CSV template
              </a>{" "}
              for the exact columns expected.
            </p>

            {(phase === "picking" || phase === "previewing") && (
              <div
                style={{
                  border: `2px dashed ${dragActive ? "var(--accent-color)" : "var(--border-color)"}`,
                  borderRadius: "var(--radius-md)",
                  padding: 32,
                  textAlign: "center",
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
              >
                {phase === "previewing" ? (
                  <p>Validating…</p>
                ) : (
                  <>
                    <p style={{ marginBottom: 12 }}>Drag &amp; drop a .csv file here, or</p>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="smoke-runner:scenario-import:btn__browse"
                    >
                      Browse File
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      style={{ display: "none" }}
                      data-testid="smoke-runner:scenario-import:input__file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(file);
                        e.target.value = "";
                      }}
                    />
                  </>
                )}
              </div>
            )}

            {phase === "preview" && preview && (
              <>
                {preview.errors.length > 0 ? (
                  <>
                    <p
                      style={{ color: "var(--fail-color)", fontWeight: 600, marginBottom: 8 }}
                      data-testid="smoke-runner:scenario-import:text__preview-summary"
                    >
                      ❌ Found {preview.errors.length} error{preview.errors.length === 1 ? "" : "s"} in{" "}
                      {preview.totalCount} row{preview.totalCount === 1 ? "" : "s"} — fix the file and
                      re-upload (no in-browser editing, to keep the file as the single source of truth).
                    </p>
                    <ul
                      style={{ marginBottom: 16, paddingLeft: 20, fontSize: "0.85rem" }}
                      data-testid="smoke-runner:scenario-import:list__errors"
                    >
                      {preview.errors.map((e) => (
                        <li key={`${e.row}-${e.column}-${e.message}`}>
                          Row {e.row}
                          {e.column && ` (${e.column})`}: {e.message}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <p
                      style={{ color: "var(--pass-color)", fontWeight: 600, marginBottom: 8 }}
                      data-testid="smoke-runner:scenario-import:text__preview-summary"
                    >
                      ✅ All {preview.validRows.length} row{preview.validRows.length === 1 ? "" : "s"} valid!
                    </p>
                    <div className="data-table-wrap" style={{ maxHeight: 300, overflowY: "auto", marginBottom: 16 }}>
                      <table className="data-table" data-testid="smoke-runner:scenario-import:tbl__preview">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Flow</th>
                            <th>Role</th>
                            <th>Critical</th>
                            <th>Tags</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.validRows.map((r, i) => (
                            <tr key={`${i}-${r.name}`}>
                              <td>{r.name}</td>
                              <td>{r.flow}</td>
                              <td>{r.role}</td>
                              <td>{r.critical ? "Yes" : "No"}</td>
                              <td>{r.tags?.join(", ")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
                {commitError && <div className="error-banner">{commitError}</div>}
              </>
            )}

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-sm"
                onClick={close}
                data-testid="smoke-runner:scenario-import:btn__cancel"
              >
                Cancel
              </button>
              {phase === "preview" && preview && preview.errors.length > 0 && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setPhase("picking")}
                  data-testid="smoke-runner:scenario-import:btn__reupload"
                >
                  Re-upload File
                </button>
              )}
              {phase === "preview" && preview && preview.errors.length === 0 && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleConfirm}
                  data-testid="smoke-runner:scenario-import:btn__confirm"
                >
                  Confirm Import ({preview.validRows.length})
                </button>
              )}
              {phase === "committing" && (
                <button type="button" className="btn btn-primary btn-sm" disabled>
                  Importing…
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
