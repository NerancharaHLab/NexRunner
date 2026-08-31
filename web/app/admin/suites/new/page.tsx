import Link from "next/link";
import { redirect } from "next/navigation";
import { listScenariosForSite } from "@/lib/azure/scenarios-table";
import { createSuite } from "@/lib/azure/test-suites-table";
import { requireRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT, MASTER_SCENARIO_PARTITION } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NewSuitePage({ searchParams }: PageProps) {
  await requireRole(CAN_EDIT_CONTENT);
  const { error } = await searchParams;
  const masterScenarios = await listScenariosForSite(MASTER_SCENARIO_PARTITION);

  async function createSuiteAction(formData: FormData) {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    const id = String(formData.get("id") || "").trim();
    const name = String(formData.get("name") || "").trim();
    if (!id || !name) {
      redirect(`/admin/suites/new?error=${encodeURIComponent("ต้องระบุ Suite ID และชื่อ Suite")}`);
    }
    const scenarioIds = masterScenarios.map((sc) => sc.id).filter((scId) => formData.get(`sc_${scId}`) === "on");
    await createSuite({
      id,
      name,
      description: String(formData.get("description") || ""),
      scenarioIds,
    });
    redirect("/admin/suites");
  }

  return (
    <main className="container">
      <Link href="/admin/suites" className="breadcrumb">
        ← กลับไปรายการ Suite
      </Link>

      <div className="page-header">
        <div>
          <h1>เพิ่ม Suite ใหม่</h1>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {masterScenarios.length === 0 && (
        <div className="error-banner">
          ยังไม่มี Scenario ใน Master Library —{" "}
          <Link href="/admin/master-scenarios">ไปเพิ่มที่ Master Library ก่อน</Link>
        </div>
      )}

      <form action={createSuiteAction} className="card">
        <div className="field-row">
          <div>
            <label htmlFor="id">Suite ID</label>
            <input id="id" name="id" placeholder="เช่น SMOKE-OPD" required data-testid="smoke-runner:admin-suite-form:input__id" />
          </div>
          <div>
            <label htmlFor="name">ชื่อ Suite</label>
            <input id="name" name="name" placeholder="เช่น Smoke — OPD Critical Path" required data-testid="smoke-runner:admin-suite-form:input__name" />
          </div>
        </div>

        <div className="field-row" style={{ gridTemplateColumns: "1fr" }}>
          <div>
            <label htmlFor="description">คำอธิบาย</label>
            <input id="description" name="description" data-testid="smoke-runner:admin-suite-form:input__description" />
          </div>
        </div>

        <div className="section-label">Scenario ในชุดนี้ (จาก Master Library)</div>
        {masterScenarios.map((sc) => (
          <label key={sc.id} className="checkbox-row" htmlFor={`sc_${sc.id}`} style={{ display: "flex", width: "100%" }}>
            <input
              type="checkbox"
              id={`sc_${sc.id}`}
              name={`sc_${sc.id}`}
              data-testid={`smoke-runner:admin-suite-form:chk-scenario__${sc.id.replace(/[^a-zA-Z0-9]/g, "")}`}
            />
            <strong>{sc.id}</strong>&nbsp;— {sc.name}
          </label>
        ))}

        <div className="form-footer">
          <button type="submit" className="btn btn-primary" data-testid="smoke-runner:admin-suite-form:btn__save">
            บันทึก
          </button>
        </div>
      </form>
    </main>
  );
}
