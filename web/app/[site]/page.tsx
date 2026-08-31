import Link from "next/link";
import { notFound } from "next/navigation";
import { listRunsForSite } from "@/lib/azure/tables";
import { getScenariosForSite } from "@/lib/scenarios";
import { requireUser } from "@/lib/auth/guard";

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
      <Link href="/" className="breadcrumb">
        ← เลือกโรงพยาบาลอื่น
      </Link>

      <div className="page-header">
        <div>
          <h1>{siteFile.siteName}</h1>
          <p className="subtitle">{runs.length} รอบทดสอบ</p>
        </div>
        <Link
          href={`/${site}/new`}
          className="btn btn-primary"
          data-testid={`smoke-runner:run-history:btn__new-run`}
        >
          + เริ่มรอบทดสอบใหม่
        </Link>
      </div>

      {runs.length === 0 && (
        <div className="card empty-state">
          <div className="empty-icon">—</div>
          ยังไม่มีรอบทดสอบสำหรับไซต์นี้
        </div>
      )}

      {runs.map((run) => (
        <Link
          key={run.rowKey}
          href={`/${site}/${run.rowKey}`}
          className="card"
          data-testid={`smoke-runner:run-history:row__${run.rowKey}`}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <strong>{run.rowKey}</strong>
            <span className={`gate-badge ${run.gateResult === "READY" ? "ready" : "notready"}`}>
              {run.gateResult}
            </span>
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 8 }}>
            {run.environment} · {run.testCycle} · {run.executedDate} · Tester: {run.tester || "-"}
          </div>
          <div className="stat-row" style={{ marginTop: 12 }}>
            <span className="stat-pill pass">✅ {run.passed}</span>
            <span className="stat-pill fail">❌ {run.failed}</span>
            <span className="stat-pill block">🟡 {run.blocked}</span>
            <span className="stat-pill">⚪ {run.notrun}</span>
            <span className="stat-pill">{run.passRatePercent}%</span>
          </div>
        </Link>
      ))}
    </main>
  );
}
