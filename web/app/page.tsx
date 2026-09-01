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
          <h1>Test Runner</h1>
          <p className="subtitle">Let&apos;s Run Some Smoke Tests</p>
          <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>Select a hospital to start or view a test run</p>
        </div>
      </div>

      {sites.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">—</div>
          No hospitals yet
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
              <span className="site-tile-go">View Test Runs →</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
