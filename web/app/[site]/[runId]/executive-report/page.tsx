import Link from "next/link";
import { notFound } from "next/navigation";
import { getRunDetail } from "@/lib/runs";
import { requireUser } from "@/lib/auth/guard";
import type { ScenarioStatus } from "@/lib/types";
import PrintButton from "./PrintButton";

interface PageProps {
  params: Promise<{ site: string; runId: string }>;
}

const STATUS_PILL_CLASS: Record<ScenarioStatus, string> = {
  passed: "pass",
  failed: "fail",
  blocked: "block",
  notrun: "",
};

function cleanId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

export default async function ExecutiveReportPage({ params }: PageProps) {
  await requireUser();
  const { site, runId } = await params;
  const detail = await getRunDetail(site, runId);
  if (!detail) notFound();

  const { run, scenarios } = detail;
  const criticalMatrix = scenarios.filter((s) => s.critical);
  const defectLog = scenarios.filter(
    (s) => s.status === "failed" || s.status === "blocked" || s.notes.trim() !== ""
  );

  return (
    <main className="container">
      <div className="report-toolbar no-print">
        <Link href={`/${site}/${runId}`} className="breadcrumb" data-testid="smoke-runner:executive-report:link__breadcrumb">
          ← Back to Run Detail
        </Link>
        <PrintButton />
      </div>

      <div className="report-paper">
        <div className="report-header">
          <div>
            <h1>EXECUTIVE VERIFICATION REPORT</h1>
            <p className="subtitle">{run.environment} Smoke Test Sign-off Matrix &amp; Audit Trail</p>
          </div>
          <div className="meta-stamp">
            <div>
              <strong>RUN ID:</strong> {run.rowKey}
            </div>
            <div>
              <strong>ISSUED DATE:</strong> {run.executedDate}
            </div>
            <div>
              <strong>ENVIRONMENT:</strong> {run.environment}
            </div>
          </div>
        </div>

        <div
          className={`gate-banner ${run.gateResult === "READY" ? "approved" : "rejected"}`}
          data-testid="smoke-runner:executive-report:banner__gate"
        >
          <div>
            <div className="gate-title">
              {run.gateResult === "READY"
                ? `APPROVED FOR ${run.environment} SIGN-OFF`
                : `REJECTED FOR ${run.environment} SIGN-OFF`}
            </div>
            <div className="gate-subtitle">
              {run.gateResult === "READY"
                ? `The system has passed all core readiness checks. Approved to open ${run.environment} for user testing as scheduled.`
                : `The system still has defects in a Critical Flow, or has failing test items. Please fix the bugs before starting ${run.environment}.`}
            </div>
          </div>
          <div>
            <div className="gate-rate-label">PASS RATE</div>
            <div className="gate-rate-num">{run.passRatePercent}%</div>
          </div>
        </div>

        <div className="section-label">Project Context &amp; Data Chain Traceability</div>
        <table className="report-table">
          <tbody>
            <tr>
              <th style={{ width: "20%" }}>System Version</th>
              <td style={{ width: "30%" }}>{run.version || "-"}</td>
              <th style={{ width: "20%" }}>Environment</th>
              <td style={{ width: "30%" }}>{run.environment}</td>
            </tr>
            <tr>
              <th>Test Cycle</th>
              <td>{run.testCycle}</td>
              <th>Run ID</th>
              <td>{run.rowKey}</td>
            </tr>
            <tr>
              <th>Hospital Site</th>
              <td>{run.siteName}</td>
              <th>Delivery Batch</th>
              <td>{run.deliveryBatch || "-"}</td>
            </tr>
            <tr>
              <th>Primary HN</th>
              <td>{run.hn || "-"}</td>
              <th>Primary VN</th>
              <td>{run.vn || "-"}</td>
            </tr>
            <tr>
              <th>Primary AN</th>
              <td>{run.an || "-"}</td>
              <th>Bill No. / INV</th>
              <td>{run.bill || "-"}</td>
            </tr>
          </tbody>
        </table>

        <div className="section-label">Execution Summary KPIs</div>
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="num" style={{ color: "var(--pass-color)" }}>
              {run.passed}
            </div>
            <div className="label">Passed</div>
          </div>
          <div className="kpi-card">
            <div className="num" style={{ color: "var(--fail-color)" }}>
              {run.failed}
            </div>
            <div className="label">Failed</div>
          </div>
          <div className="kpi-card">
            <div className="num" style={{ color: "var(--block-color)" }}>
              {run.blocked}
            </div>
            <div className="label">Blocked</div>
          </div>
          <div className="kpi-card">
            <div className="num" style={{ color: "var(--notrun-color)" }}>
              {run.notrun}
            </div>
            <div className="label">Not Run</div>
          </div>
        </div>

        <div className="section-label">Critical Flow Verification Matrix</div>
        <table className="report-table">
          <thead>
            <tr>
              <th style={{ width: "15%" }}>Scenario ID</th>
              <th style={{ width: "45%" }}>Critical Business Scenario</th>
              <th style={{ width: "25%" }}>Role Responsible</th>
              <th style={{ width: "15%", textAlign: "center" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {criticalMatrix.map((sc) => (
              <tr key={sc.id} data-testid={`smoke-runner:executive-report:row-critical__${cleanId(sc.id)}`}>
                <td>
                  <strong>{sc.id}</strong>
                </td>
                <td>{sc.name}</td>
                <td>{sc.role}</td>
                <td style={{ textAlign: "center" }}>
                  <span className={`stat-pill ${STATUS_PILL_CLASS[sc.status]}`}>{sc.status.toUpperCase()}</span>
                </td>
              </tr>
            ))}
            {criticalMatrix.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "var(--text-secondary)" }}>
                  No Critical Flow for this site
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="section-label">Defect Log &amp; Risk Audit</div>
        <table className="report-table">
          <thead>
            <tr>
              <th style={{ width: "15%" }}>Scenario ID</th>
              <th style={{ width: "45%" }}>Scenario Name</th>
              <th style={{ width: "25%" }}>Defect / Remarks</th>
              <th style={{ width: "15%", textAlign: "center" }}>Severity</th>
            </tr>
          </thead>
          <tbody>
            {defectLog.map((sc) => (
              <tr key={sc.id} data-testid={`smoke-runner:executive-report:row-defect__${cleanId(sc.id)}`}>
                <td>
                  <strong>{sc.id}</strong>
                </td>
                <td>{sc.name}</td>
                <td>{sc.notes || "No bug details provided"}</td>
                <td style={{ textAlign: "center" }}>
                  <span className={`stat-pill ${STATUS_PILL_CLASS[sc.status]}`}>{sc.status.toUpperCase()}</span>
                </td>
              </tr>
            ))}
            {defectLog.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "var(--pass-color)" }}>
                  ✨ No Defect Found in this test run
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="signature-section">
          <div className="sig-box">
            <div className="sig-title">PREPARED &amp; VERIFIED BY (QA LEAD)</div>
            <div className="sig-line" />
            <div className="sig-sub">( {run.tester || "................................................................"} )</div>
            <div className="sig-sub">Lead Quality Assurance / Tester</div>
            <div className="sig-sub" style={{ marginTop: 8 }}>
              Date: ____ / ____ / ________
            </div>
          </div>
          <div className="sig-box">
            <div className="sig-title">APPROVED FOR {run.environment} (CLIENT / EXECUTIVE)</div>
            <div className="sig-line" />
            <div className="sig-sub">( ................................................................ )</div>
            <div className="sig-sub">Project Manager / Client Representative</div>
            <div className="sig-sub" style={{ marginTop: 8 }}>
              Date: ____ / ____ / ________
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
