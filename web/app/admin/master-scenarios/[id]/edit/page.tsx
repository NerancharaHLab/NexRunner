import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deleteScenario, getScenario, updateScenario } from "@/lib/azure/scenarios-table";
import { listTags } from "@/lib/azure/tags-table";
import { requireRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT, MASTER_SCENARIO_PARTITION } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

const FLOWS = ["OPD", "IPD", "General"] as const;

export default async function EditMasterScenarioPage({ params, searchParams }: PageProps) {
  await requireRole(CAN_EDIT_CONTENT);
  const { id: rawId } = await params;
  const scenarioId = decodeURIComponent(rawId);
  const { error } = await searchParams;

  const scenario = await getScenario(MASTER_SCENARIO_PARTITION, scenarioId);
  if (!scenario) notFound();
  const tags = await listTags();
  const scenarioTagSet = new Set(scenario.tags ?? []);

  async function updateScenarioAction(formData: FormData) {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    const newId = String(formData.get("id") || "").trim();
    if (!newId) {
      redirect(
        `/admin/master-scenarios/${encodeURIComponent(scenarioId)}/edit?error=${encodeURIComponent("Scenario ID is required")}`
      );
    }
    const allTags = await listTags();
    await updateScenario(MASTER_SCENARIO_PARTITION, scenarioId, {
      id: newId,
      flow: String(formData.get("flow") || "OPD") as "OPD" | "IPD" | "General",
      name: String(formData.get("name") || ""),
      desc: String(formData.get("desc") || ""),
      role: String(formData.get("role") || ""),
      critical: formData.get("critical") === "on",
      steps: String(formData.get("steps") || ""),
      criteria: String(formData.get("criteria") || ""),
      tags: allTags.map((t) => t.id).filter((id) => formData.get(`tag_${id}`) === "on"),
    });
    redirect("/admin/master-scenarios");
  }

  async function deleteScenarioAction() {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    await deleteScenario(MASTER_SCENARIO_PARTITION, scenarioId);
    redirect("/admin/master-scenarios");
  }

  return (
    <main className="container">
      <Link href="/admin/master-scenarios" className="breadcrumb">
        ← Back to Master Scenario List
      </Link>

      <div className="page-header">
        <div>
          <h1>Edit Master Scenario</h1>
          <p className="subtitle">Master Scenario Library</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form action={updateScenarioAction} className="card">
        <div className="field-row">
          <div>
            <label htmlFor="id">Scenario ID</label>
            <input id="id" name="id" defaultValue={scenario.id} required data-testid="smoke-runner:admin-scenario-form:input__id" />
          </div>
          <div>
            <label htmlFor="flow">Flow</label>
            <select id="flow" name="flow" defaultValue={scenario.flow} data-testid="smoke-runner:admin-scenario-form:select__flow">
              {FLOWS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="role">Role</label>
            <input id="role" name="role" defaultValue={scenario.role} data-testid="smoke-runner:admin-scenario-form:input__role" />
          </div>
        </div>

        <label className="checkbox-row" htmlFor="critical">
          <input
            type="checkbox"
            id="critical"
            name="critical"
            defaultChecked={scenario.critical}
            data-testid="smoke-runner:admin-scenario-form:chk__critical"
          />
          Critical Flow
        </label>

        <div className="field-row" style={{ gridTemplateColumns: "1fr" }}>
          <div>
            <label htmlFor="name">Scenario Name</label>
            <input id="name" name="name" defaultValue={scenario.name} required data-testid="smoke-runner:admin-scenario-form:input__name" />
          </div>
        </div>

        <div className="field-row" style={{ gridTemplateColumns: "1fr" }}>
          <div>
            <label htmlFor="desc">Description</label>
            <input id="desc" name="desc" defaultValue={scenario.desc} data-testid="smoke-runner:admin-scenario-form:input__desc" />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="steps">Test Steps</label>
          <textarea
            id="steps"
            name="steps"
            rows={10}
            defaultValue={scenario.steps}
            className="notes-input"
            style={{ fontFamily: "monospace", fontSize: "0.85rem" }}
            data-testid="smoke-runner:admin-scenario-form:textarea__steps"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="criteria">Expected Pass Criteria</label>
          <textarea
            id="criteria"
            name="criteria"
            rows={5}
            defaultValue={scenario.criteria}
            className="notes-input"
            style={{ fontFamily: "monospace", fontSize: "0.85rem" }}
            data-testid="smoke-runner:admin-scenario-form:textarea__criteria"
          />
        </div>

        <div className="section-label">Tag</div>
        {tags.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 12 }}>
            No Tags yet — <Link href="/admin/tags/new">create one on the Manage Tags page</Link>
          </p>
        ) : (
          tags.map((tag) => (
            <label key={tag.id} className="checkbox-row" htmlFor={`tag_${tag.id}`} style={{ display: "flex", width: "100%" }}>
              <input
                type="checkbox"
                id={`tag_${tag.id}`}
                name={`tag_${tag.id}`}
                defaultChecked={scenarioTagSet.has(tag.id)}
                data-testid={`smoke-runner:admin-scenario-form:chk-tag__${tag.id}`}
              />
              {tag.name}
            </label>
          ))
        )}

        <div className="form-footer">
          <button type="submit" className="btn btn-primary" data-testid="smoke-runner:admin-scenario-form:btn__save">
            Save
          </button>
        </div>
      </form>

      <form action={deleteScenarioAction} style={{ marginTop: 4 }}>
        <button
          type="submit"
          className="btn btn-danger-text"
          data-testid="smoke-runner:admin-scenario-form:btn__delete"
        >
          Delete this Scenario
        </button>
      </form>
    </main>
  );
}
