import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getScenariosForSite } from "@/lib/scenarios";
import { createScenario } from "@/lib/azure/scenarios-table";
import { requireRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT } from "@/lib/types";

interface PageProps {
  params: Promise<{ site: string }>;
  searchParams: Promise<{ error?: string }>;
}

const FLOWS = ["OPD", "IPD", "General"] as const;

export default async function NewScenarioPage({ params, searchParams }: PageProps) {
  const { site } = await params;
  const { error } = await searchParams;
  const siteFile = await getScenariosForSite(site);
  if (!siteFile) notFound();

  async function createScenarioAction(formData: FormData) {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    const id = String(formData.get("id") || "").trim();
    if (!id) {
      redirect(`/admin/scenarios/${site}/new?error=${encodeURIComponent("ต้องระบุ Scenario ID")}`);
    }
    await createScenario(site, {
      id,
      flow: String(formData.get("flow") || "OPD") as "OPD" | "IPD" | "General",
      name: String(formData.get("name") || ""),
      desc: String(formData.get("desc") || ""),
      role: String(formData.get("role") || ""),
      critical: formData.get("critical") === "on",
      steps: String(formData.get("steps") || ""),
      criteria: String(formData.get("criteria") || ""),
    });
    redirect(`/admin/scenarios/${site}`);
  }

  return (
    <main className="container">
      <Link href={`/admin/scenarios/${site}`} className="breadcrumb">
        ← กลับไปรายการ Scenario
      </Link>

      <div className="page-header">
        <div>
          <h1>เพิ่ม Scenario ใหม่</h1>
          <p className="subtitle">{siteFile.siteName}</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form action={createScenarioAction} className="card">
        <div className="field-row">
          <div>
            <label htmlFor="id">Scenario ID</label>
            <input id="id" name="id" placeholder="เช่น SC-18" required data-testid="smoke-runner:admin-scenario-form:input__id" />
          </div>
          <div>
            <label htmlFor="flow">Flow</label>
            <select id="flow" name="flow" defaultValue="OPD" data-testid="smoke-runner:admin-scenario-form:select__flow">
              {FLOWS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="role">ผู้เกี่ยวข้อง (Role)</label>
            <input id="role" name="role" placeholder="เช่น แพทย์ OPD / พยาบาล" data-testid="smoke-runner:admin-scenario-form:input__role" />
          </div>
        </div>

        <label className="checkbox-row" htmlFor="critical">
          <input type="checkbox" id="critical" name="critical" data-testid="smoke-runner:admin-scenario-form:chk__critical" />
          Critical Flow
        </label>

        <div className="field-row" style={{ gridTemplateColumns: "1fr" }}>
          <div>
            <label htmlFor="name">ชื่อ Scenario</label>
            <input id="name" name="name" required data-testid="smoke-runner:admin-scenario-form:input__name" />
          </div>
        </div>

        <div className="field-row" style={{ gridTemplateColumns: "1fr" }}>
          <div>
            <label htmlFor="desc">คำอธิบาย</label>
            <input id="desc" name="desc" data-testid="smoke-runner:admin-scenario-form:input__desc" />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="steps">ขั้นตอนทดสอบ (Test Steps)</label>
          <textarea
            id="steps"
            name="steps"
            rows={10}
            className="notes-input"
            style={{ fontFamily: "monospace", fontSize: "0.85rem" }}
            placeholder={"1. ...\n2. ...\n3. ..."}
            data-testid="smoke-runner:admin-scenario-form:textarea__steps"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="criteria">เกณฑ์การผ่าน (Expected Pass Criteria)</label>
          <textarea
            id="criteria"
            name="criteria"
            rows={5}
            className="notes-input"
            style={{ fontFamily: "monospace", fontSize: "0.85rem" }}
            data-testid="smoke-runner:admin-scenario-form:textarea__criteria"
          />
        </div>

        <div className="form-footer">
          <button type="submit" className="btn btn-primary" data-testid="smoke-runner:admin-scenario-form:btn__save">
            บันทึก
          </button>
        </div>
      </form>
    </main>
  );
}
