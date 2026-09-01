import Link from "next/link";
import { notFound } from "next/navigation";
import { getRunDetail } from "@/lib/runs";
import { requireUser } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT, hasAnyRole } from "@/lib/types";
import ScenarioBoard from "./ScenarioBoard";

interface PageProps {
  params: Promise<{ site: string; runId: string }>;
}

export default async function RunDetailPage({ params }: PageProps) {
  const user = await requireUser();
  const { site, runId } = await params;
  const detail = await getRunDetail(site, runId);
  if (!detail) notFound();

  const canEdit = hasAnyRole(user.roles, CAN_EDIT_CONTENT);

  return (
    <main className="container">
      <Link href={`/${site}`} className="breadcrumb">
        ← Back to Run List
      </Link>

      <div className="page-header">
        <div>
          <h1>
            {detail.run.siteName} — {detail.run.rowKey}
          </h1>
          {detail.run.name && (
            <p
              style={{ color: "var(--text-secondary)", marginTop: 2, fontStyle: "italic" }}
              data-testid="smoke-runner:run-detail:text__name"
            >
              {detail.run.name}
            </p>
          )}
          <p className="subtitle">
            {detail.run.environment} · {detail.run.testCycle} · {detail.run.executedDate} · Tester:{" "}
            {detail.run.tester || "-"}
            {detail.run.suiteNamesJson && (
              <> · Suite: {(JSON.parse(detail.run.suiteNamesJson) as string[]).join(", ")}</>
            )}
            {detail.run.tagIncludeNamesJson && (
              <>
                {" "}
                · Must have Tag: {(JSON.parse(detail.run.tagIncludeNamesJson) as string[]).join(", ")} (
                {detail.run.tagIncludeMode === "AND" ? "all of them" : "at least 1"})
              </>
            )}
            {detail.run.tagExcludeNamesJson && (
              <> · Must not have Tag: {(JSON.parse(detail.run.tagExcludeNamesJson) as string[]).join(", ")}</>
            )}
          </p>
        </div>
        {canEdit && (
          <Link
            href={`/${site}/${runId}/edit`}
            className="btn"
            data-testid="smoke-runner:run-detail:link__edit-run"
          >
            Edit Run
          </Link>
        )}
      </div>

      <ScenarioBoard site={site} runId={runId} initialRun={detail.run} initialScenarios={detail.scenarios} />
    </main>
  );
}
