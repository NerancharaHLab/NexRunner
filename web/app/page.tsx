import Link from "next/link";
import { listSites } from "@/lib/scenarios";
import { requireUser } from "@/lib/auth/guard";

export default async function HomePage() {
  await requireUser();
  const sites = await listSites();

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1>Smoke Test Runner</h1>
          <p className="subtitle">Let&apos;s Run Some Smoke Tests</p>
          <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>เลือกโรงพยาบาลเพื่อเริ่ม/ดูรอบทดสอบ</p>
        </div>
      </div>

      {sites.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">—</div>
          ยังไม่มีข้อมูลโรงพยาบาล
        </div>
      ) : (
        <div className="site-grid">
          {sites.map((h) => (
            <Link
              key={h.id}
              href={`/${h.id}`}
              className="site-tile"
              data-testid={`smoke-runner:site-picker:tile__${h.id.toLowerCase()}`}
            >
              <span className="site-tile-mark">{h.id.slice(0, 2).toUpperCase()}</span>
              <span className="site-tile-name">{h.name}</span>
              <span className="site-tile-go">ดูรอบทดสอบ →</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
