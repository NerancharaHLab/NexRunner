import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteSuite, listSuites } from "@/lib/azure/test-suites-table";
import { requireRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT } from "@/lib/types";

export default async function SuitesListPage() {
  await requireRole(CAN_EDIT_CONTENT);
  const suites = await listSuites();

  async function deleteSuiteAction(formData: FormData) {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    const suiteId = String(formData.get("suiteId") || "");
    await deleteSuite(suiteId);
    redirect("/admin/suites");
  }

  return (
    <main className="container">
      <Link href="/admin/scenarios" className="breadcrumb">
        ← กลับไปจัดการ Scenario
      </Link>

      <div className="page-header">
        <div>
          <h1>จัดการ Suite</h1>
          <p className="subtitle">
            รวมกลุ่ม Master Scenario เป็นชุดทดสอบ — เลือก Suite ตอนเริ่มรอบทดสอบใหม่เพื่อทดสอบเฉพาะ Scenario ในชุดนั้น
          </p>
        </div>
        <Link href="/admin/suites/new" className="btn btn-primary" data-testid="smoke-runner:admin-suites:btn__new">
          + เพิ่ม Suite
        </Link>
      </div>

      {suites.length === 0 && (
        <div className="card empty-state">
          <div className="empty-icon">—</div>
          ยังไม่มี Suite
        </div>
      )}

      {suites.map((suite) => (
        <div
          key={suite.id}
          className="card"
          data-testid={`smoke-runner:admin-suites:row__${suite.id.replace(/[^a-zA-Z0-9]/g, "")}`}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong>{suite.name}</strong>
              <span className="stat-pill" style={{ marginLeft: 8 }}>
                {suite.scenarioIds.length} Scenario
              </span>
              {suite.description && (
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 4 }}>{suite.description}</div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Link
                href={`/admin/suites/${encodeURIComponent(suite.id)}/edit`}
                className="btn"
                data-testid={`smoke-runner:admin-suites:btn-edit__${suite.id.replace(/[^a-zA-Z0-9]/g, "")}`}
              >
                แก้ไข
              </Link>
              <form action={deleteSuiteAction}>
                <input type="hidden" name="suiteId" value={suite.id} />
                <button
                  type="submit"
                  className="btn btn-danger-text"
                  data-testid={`smoke-runner:admin-suites:btn-delete__${suite.id.replace(/[^a-zA-Z0-9]/g, "")}`}
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
