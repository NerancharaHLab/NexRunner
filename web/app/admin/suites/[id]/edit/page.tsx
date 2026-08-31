import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { listScenariosForSite } from "@/lib/azure/scenarios-table";
import { deleteSuite, getSuite, updateSuite } from "@/lib/azure/test-suites-table";
import { requireRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT, MASTER_SCENARIO_PARTITION } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function EditSuitePage({ params, searchParams }: PageProps) {
  await requireRole(CAN_EDIT_CONTENT);
  const { id: rawId } = await params;
  const suiteId = decodeURIComponent(rawId);
  const { error } = await searchParams;

  const suite = await getSuite(suiteId);
  if (!suite) notFound();
  const masterScenarios = await listScenariosForSite(MASTER_SCENARIO_PARTITION);

  async function updateSuiteAction(formData: FormData) {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    const newId = String(formData.get("id") || "").trim();
    const name = String(formData.get("name") || "").trim();
    if (!newId || !name) {
      redirect(
        `/admin/suites/${encodeURIComponent(suiteId)}/edit?error=${encodeURIComponent("ต้องระบุ Suite ID และชื่อ Suite")}`
      );
    }
    const scenarioIds = masterScenarios.map((sc) => sc.id).filter((scId) => formData.get(`sc_${scId}`) === "on");
    await updateSuite(suiteId, {
      id: newId,
      name,
      description: String(formData.get("description") || ""),
      scenarioIds,
    });
    redirect("/admin/suites");
  }

  async function deleteSuiteAction() {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    await deleteSuite(suiteId);
    redirect("/admin/suites");
  }

  return (
    <main className="container">
      <Link href="/admin/suites" className="breadcrumb">
        ← กลับไปรายการ Suite
      </Link>

      <div className="page-header">
        <div>
          <h1>แก้ไข Suite</h1>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form action={updateSuiteAction} className="card">
        <div className="field-row">
          <div>
            <label htmlFor="id">Suite ID</label>
            <input id="id" name="id" defaultValue={suite.id} required data-testid="smoke-runner:admin-suite-form:input__id" />
          </div>
          <div>
            <label htmlFor="name">ชื่อ Suite</label>
            <input id="name" name="name" defaultValue={suite.name} required data-testid="smoke-runner:admin-suite-form:input__name" />
          </div>
        </div>

        <div className="field-row" style={{ gridTemplateColumns: "1fr" }}>
          <div>
            <label htmlFor="description">คำอธิบาย</label>
            <input id="description" name="description" defaultValue={suite.description} data-testid="smoke-runner:admin-suite-form:input__description" />
          </div>
        </div>

        <div className="section-label">Scenario ในชุดนี้ (จาก Master Library)</div>
        {masterScenarios.map((sc) => (
          <label key={sc.id} className="checkbox-row" htmlFor={`sc_${sc.id}`} style={{ display: "flex", width: "100%" }}>
            <input
              type="checkbox"
              id={`sc_${sc.id}`}
              name={`sc_${sc.id}`}
              defaultChecked={suite.scenarioIds.includes(sc.id)}
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

      <form action={deleteSuiteAction} style={{ marginTop: 4 }}>
        <button type="submit" className="btn btn-danger-text" data-testid="smoke-runner:admin-suite-form:btn__delete">
          ลบ Suite นี้
        </button>
      </form>
    </main>
  );
}
