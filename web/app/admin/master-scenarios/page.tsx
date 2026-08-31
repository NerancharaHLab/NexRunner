import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteScenario, listScenariosForSite } from "@/lib/azure/scenarios-table";
import { requireRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT, MASTER_SCENARIO_PARTITION } from "@/lib/types";

export default async function MasterScenariosListPage() {
  await requireRole(CAN_EDIT_CONTENT);
  const scenarios = await listScenariosForSite(MASTER_SCENARIO_PARTITION);

  async function deleteScenarioAction(formData: FormData) {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    const scenarioId = String(formData.get("scenarioId") || "");
    await deleteScenario(MASTER_SCENARIO_PARTITION, scenarioId);
    redirect("/admin/master-scenarios");
  }

  return (
    <main className="container">
      <Link href="/admin/scenarios" className="breadcrumb">
        ← กลับไปจัดการ Scenario
      </Link>

      <div className="page-header">
        <div>
          <h1>Master Scenario Library</h1>
          <p className="subtitle">
            ต้นแบบ Scenario ส่วนกลาง — แต่ละโรงพยาบาล Clone จากที่นี่ไปใช้ได้ แก้ที่นี่ไม่กระทบของที่ Clone ไปแล้ว
            จนกว่าจะ Clone ซ้ำ
          </p>
        </div>
        <Link
          href="/admin/master-scenarios/new"
          className="btn btn-primary"
          data-testid="smoke-runner:admin-master-scenarios:btn__new"
        >
          + เพิ่ม Scenario
        </Link>
      </div>

      {scenarios.length === 0 && (
        <div className="card empty-state">
          <div className="empty-icon">—</div>
          ยังไม่มี Scenario ใน Master Library
        </div>
      )}

      {scenarios.map((sc) => (
        <div
          key={sc.id}
          className="card"
          data-testid={`smoke-runner:admin-master-scenarios:row__${sc.id.replace(/[^a-zA-Z0-9]/g, "")}`}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong>{sc.id}</strong>
              {sc.critical && <span className="critical-badge">Critical Flow</span>}
              <div>{sc.name}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                {sc.flow} · {sc.role}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Link
                href={`/admin/master-scenarios/${encodeURIComponent(sc.id)}/edit`}
                className="btn"
                data-testid={`smoke-runner:admin-master-scenarios:btn-edit__${sc.id.replace(/[^a-zA-Z0-9]/g, "")}`}
              >
                แก้ไข
              </Link>
              <form action={deleteScenarioAction}>
                <input type="hidden" name="scenarioId" value={sc.id} />
                <button
                  type="submit"
                  className="btn btn-danger-text"
                  data-testid={`smoke-runner:admin-master-scenarios:btn-delete__${sc.id.replace(/[^a-zA-Z0-9]/g, "")}`}
                >
                  ลบ
                </button>
              </form>
            </div>
          </div>
        </div>
      ))}
    </main>
  );
}
