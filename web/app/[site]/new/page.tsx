import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getScenariosForSite } from "@/lib/scenarios";
import { listSuites } from "@/lib/azure/test-suites-table";
import { ENVIRONMENTS } from "@/lib/config";
import { createRun, CreateRunError, suggestNextRunId } from "@/lib/runs";
import { requireUser } from "@/lib/auth/guard";

interface PageProps {
  params: Promise<{ site: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function NewRunPage({ params, searchParams }: PageProps) {
  const user = await requireUser();
  const { site } = await params;
  const { error } = await searchParams;
  const siteFile = await getScenariosForSite(site);
  if (!siteFile) notFound();

  const suggestedRunId = await suggestNextRunId(site);
  const today = new Date().toISOString().slice(0, 10);
  const suites = await listSuites();

  async function startRun(formData: FormData) {
    "use server";
    let run;
    try {
      run = await createRun({
        siteKey: site,
        runId: String(formData.get("runId") || ""),
        environment: String(formData.get("environment") || "STAGING"),
        testCycle: String(formData.get("testCycle") || "Cycle 1"),
        executedDate: String(formData.get("executedDate") || ""),
        // Never trust a client-submitted tester name — always the logged-in
        // user, even if the form field were tampered with (see the "lock
        // Tester" request; the input below is display-only, not editable).
        tester: user.displayName,
        version: String(formData.get("version") || ""),
        deliveryBatch: String(formData.get("deliveryBatch") || ""),
        hn: String(formData.get("hn") || ""),
        vn: String(formData.get("vn") || ""),
        an: String(formData.get("an") || ""),
        bill: String(formData.get("bill") || ""),
        suiteIds: suites.map((s) => s.id).filter((id) => formData.get(`suite_${id}`) === "on"),
      });
    } catch (err) {
      if (err instanceof CreateRunError) {
        redirect(`/${site}/new?error=${encodeURIComponent(err.message)}`);
      }
      throw err;
    }
    redirect(`/${site}/${run.rowKey}`);
  }

  return (
    <main className="container">
      <Link href={`/${site}`} className="breadcrumb">
        ← กลับไปรายการ Run
      </Link>

      <div className="page-header">
        <div>
          <h1>เริ่มรอบทดสอบใหม่</h1>
          <p className="subtitle">{siteFile.siteName}</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form action={startRun} className="card">
        <div className="section-label">ข้อมูลรอบทดสอบ</div>
        <div className="field-row">
          <div>
            <label htmlFor="runId">Run ID</label>
            <input
              id="runId"
              name="runId"
              defaultValue={suggestedRunId}
              required
              data-testid="smoke-runner:new-run:input__run-id"
            />
          </div>
          <div>
            <label htmlFor="environment">Environment</label>
            <select
              id="environment"
              name="environment"
              defaultValue="STAGING"
              data-testid="smoke-runner:new-run:select__environment"
            >
              {ENVIRONMENTS.map((env) => (
                <option key={env} value={env}>
                  {env}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="testCycle">Test Cycle</label>
            <input
              id="testCycle"
              name="testCycle"
              defaultValue="Cycle 1"
              data-testid="smoke-runner:new-run:input__test-cycle"
            />
          </div>
          <div>
            <label htmlFor="executedDate">Date Executed</label>
            <input
              id="executedDate"
              name="executedDate"
              type="date"
              defaultValue={today}
              data-testid="smoke-runner:new-run:input__executed-date"
            />
          </div>
          <div>
            <label htmlFor="tester">Tester Name</label>
            {/* Locked to the logged-in user — not an <input>, so it can't be
                changed client-side either (see startRun above for the
                server-side enforcement). */}
            <div
              id="tester"
              className="field-static-value"
              data-testid="smoke-runner:new-run:input__tester"
            >
              {user.displayName}
            </div>
          </div>
          <div>
            <label htmlFor="version">System Version</label>
            <input
              id="version"
              name="version"
              placeholder="v1.0.0"
              data-testid="smoke-runner:new-run:input__version"
            />
          </div>
          <div>
            <label htmlFor="deliveryBatch">Delivery Batch</label>
            <input
              id="deliveryBatch"
              name="deliveryBatch"
              placeholder="D 1"
              data-testid="smoke-runner:new-run:input__delivery-batch"
            />
          </div>
        </div>

        <div className="section-label">Suite (เลือกได้หลายชุด — ไม่เลือกเลย = ทดสอบทุก Scenario ของไซต์นี้)</div>
        {suites.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 4 }}>
            ยังไม่มี Suite — <Link href="/admin/suites">ไปสร้างที่หน้าจัดการ Suite</Link>
          </p>
        ) : (
          suites.map((suite) => (
            <label
              key={suite.id}
              className="checkbox-row"
              htmlFor={`suite_${suite.id}`}
              style={{ display: "flex", width: "100%" }}
            >
              <input
                type="checkbox"
                id={`suite_${suite.id}`}
                name={`suite_${suite.id}`}
                data-testid={`smoke-runner:new-run:chk-suite__${suite.id.replace(/[^a-zA-Z0-9]/g, "")}`}
              />
              <strong>{suite.name}</strong>
              {suite.description && <span style={{ color: "var(--text-secondary)" }}>&nbsp;— {suite.description}</span>}
            </label>
          ))
        )}

        <div className="section-label">Data Chain Tracker</div>
        <div className="field-row">
          <div>
            <label htmlFor="hn">Primary HN</label>
            <input id="hn" name="hn" data-testid="smoke-runner:new-run:input__hn" />
          </div>
          <div>
            <label htmlFor="vn">Primary VN</label>
            <input id="vn" name="vn" data-testid="smoke-runner:new-run:input__vn" />
          </div>
          <div>
            <label htmlFor="an">Primary AN</label>
            <input id="an" name="an" data-testid="smoke-runner:new-run:input__an" />
          </div>
          <div>
            <label htmlFor="bill">Bill No. / INV</label>
            <input id="bill" name="bill" data-testid="smoke-runner:new-run:input__bill" />
          </div>
        </div>

        <div className="form-footer">
          <button type="submit" className="btn btn-primary" data-testid="smoke-runner:new-run:btn__start">
            เริ่มรอบทดสอบ
          </button>
        </div>
      </form>
    </main>
  );
}
