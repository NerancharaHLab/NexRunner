import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRun } from "@/lib/db/tables";
import { ENVIRONMENTS } from "@/lib/config";
import { CreateRunError, updateRunMetadata } from "@/lib/runs";
import { requireRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT } from "@/lib/types";

interface PageProps {
  params: Promise<{ site: string; runId: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function EditRunPage({ params, searchParams }: PageProps) {
  await requireRole(CAN_EDIT_CONTENT);
  const { site, runId } = await params;
  const { error } = await searchParams;

  const run = await getRun(site, runId);
  if (!run) notFound();

  async function updateRunAction(formData: FormData) {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    try {
      await updateRunMetadata(site, runId, {
        name: String(formData.get("name") || ""),
        environment: String(formData.get("environment") || ""),
        testCycle: String(formData.get("testCycle") || ""),
        executedDate: String(formData.get("executedDate") || ""),
        version: String(formData.get("version") || ""),
        deliveryBatch: String(formData.get("deliveryBatch") || ""),
        hn: String(formData.get("hn") || ""),
        vn: String(formData.get("vn") || ""),
        an: String(formData.get("an") || ""),
        bill: String(formData.get("bill") || ""),
      });
    } catch (err) {
      if (err instanceof CreateRunError) {
        redirect(`/${site}/${runId}/edit?error=${encodeURIComponent(err.message)}`);
      }
      throw err;
    }
    redirect(`/${site}/${runId}`);
  }

  return (
    <main className="container">
      <Link href={`/${site}/${runId}`} className="breadcrumb" data-testid="smoke-runner:run-edit:link__breadcrumb">
        ← Back to Run Detail
      </Link>

      <div className="page-header">
        <div>
          <h1>Edit Run</h1>
          <p className="subtitle">
            {run.siteName} — {run.rowKey} · Tester: {run.tester || "-"}
          </p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form action={updateRunAction} className="card">
        <div className="section-label">Test Run Info</div>
        <div className="field-row" style={{ gridTemplateColumns: "1fr" }}>
          <div>
            <label htmlFor="name">Run Name (optional)</label>
            <input
              id="name"
              name="name"
              defaultValue={run.name}
              placeholder="e.g. Pre-UAT Smoke — Release 2.4.0"
              data-testid="smoke-runner:run-edit:input__name"
            />
          </div>
        </div>
        <div className="field-row">
          <div>
            <label htmlFor="environment">Environment</label>
            <select
              id="environment"
              name="environment"
              defaultValue={run.environment}
              data-testid="smoke-runner:run-edit:select__environment"
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
              defaultValue={run.testCycle}
              data-testid="smoke-runner:run-edit:input__test-cycle"
            />
          </div>
          <div>
            <label htmlFor="executedDate">Date Executed</label>
            <input
              id="executedDate"
              name="executedDate"
              type="date"
              defaultValue={run.executedDate}
              data-testid="smoke-runner:run-edit:input__executed-date"
            />
          </div>
          <div>
            <label htmlFor="version">System Version</label>
            <input
              id="version"
              name="version"
              defaultValue={run.version}
              data-testid="smoke-runner:run-edit:input__version"
            />
          </div>
          <div>
            <label htmlFor="deliveryBatch">Delivery Batch</label>
            <input
              id="deliveryBatch"
              name="deliveryBatch"
              defaultValue={run.deliveryBatch}
              data-testid="smoke-runner:run-edit:input__delivery-batch"
            />
          </div>
        </div>

        <div className="section-label">Data Chain Tracker</div>
        <div className="field-row">
          <div>
            <label htmlFor="hn">Primary HN</label>
            <input id="hn" name="hn" defaultValue={run.hn} data-testid="smoke-runner:run-edit:input__hn" />
          </div>
          <div>
            <label htmlFor="vn">Primary VN</label>
            <input id="vn" name="vn" defaultValue={run.vn} data-testid="smoke-runner:run-edit:input__vn" />
          </div>
          <div>
            <label htmlFor="an">Primary AN</label>
            <input id="an" name="an" defaultValue={run.an} data-testid="smoke-runner:run-edit:input__an" />
          </div>
          <div>
            <label htmlFor="bill">Bill No. / INV</label>
            <input id="bill" name="bill" defaultValue={run.bill} data-testid="smoke-runner:run-edit:input__bill" />
          </div>
        </div>

        <div className="form-footer">
          <button type="submit" className="btn btn-primary" data-testid="smoke-runner:run-edit:btn__save">
            Save
          </button>
        </div>
      </form>
    </main>
  );
}
