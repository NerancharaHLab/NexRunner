import Link from "next/link";
import { notFound } from "next/navigation";
import { listRunsForSite } from "@/lib/db/tables";
import { getScenariosForSite } from "@/lib/scenarios";
import { requireUser } from "@/lib/auth/guard";
import RunHistoryList from "./RunHistoryList";

interface PageProps {
  params: Promise<{ site: string }>;
}

export default async function SiteRunsPage({ params }: PageProps) {
  await requireUser();
  const { site } = await params;
  const siteFile = await getScenariosForSite(site);
  if (!siteFile) notFound();

  const runs = await listRunsForSite(site);

  return (
    <main className="container">
      <Link href="/" className="breadcrumb" data-testid="smoke-runner:run-history:link__breadcrumb">
        ← Choose Another Hospital
      </Link>

      <div className="page-header">
        <div>
          <h1>{siteFile.siteName}</h1>
          <p className="subtitle">{runs.length} Test Runs</p>
        </div>
        <Link
          href={`/${site}/new`}
          className="btn btn-primary btn-lg"
          data-testid={`smoke-runner:run-history:btn__new-run`}
        >
          + Start New Run
        </Link>
      </div>

      {runs.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">—</div>
          No test runs for this site yet
        </div>
      ) : (
        <RunHistoryList
          siteKey={site}
          runs={runs.map((run) => ({
            rowKey: run.rowKey,
            name: run.name ?? "",
            environment: run.environment,
            testCycle: run.testCycle,
            executedDate: run.executedDate,
            tester: run.tester,
            passed: run.passed,
            failed: run.failed,
            blocked: run.blocked,
            notrun: run.notrun,
            passRatePercent: run.passRatePercent,
            gateResult: run.gateResult,
          }))}
        />
      )}
    </main>
  );
}
