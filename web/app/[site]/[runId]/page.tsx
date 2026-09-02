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
      <Link href={`/${site}`} className="breadcrumb" data-testid="smoke-runner:run-detail:link__breadcrumb">
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
        {/* The Edit Run link is rendered inside ScenarioBoard (not here) so it reacts live to
            run.locked — Lock/Unlock happen client-side via fetch(), and this outer Server
            Component only renders once per page load, so a link gated here would stay frozen at
            whatever locked/unlocked state the Run was in when the page first loaded. */}
      </div>

      <ScenarioBoard
        site={site}
        runId={runId}
        initialRun={detail.run}
        initialScenarios={detail.scenarios}
        initialLockEvents={detail.lockEvents}
        canUnlock={canEdit}
      />
    </main>
  );
}
