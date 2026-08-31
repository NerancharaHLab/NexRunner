import Link from "next/link";
import { listSites } from "@/lib/scenarios";

export default async function ScenariosAdminPickSitePage() {
  const sites = await listSites();

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1>Manage Scenarios</h1>
          <p className="subtitle">Select a hospital to manage</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link
            href="/admin/tags"
            className="btn"
            data-testid="smoke-runner:admin-scenarios:link__tags"
          >
            Manage Tags →
          </Link>
          <Link
            href="/admin/suites"
            className="btn"
            data-testid="smoke-runner:admin-scenarios:link__suites"
          >
            Manage Suites →
          </Link>
          <Link
            href="/admin/master-scenarios"
            className="btn"
            data-testid="smoke-runner:admin-scenarios:link__master-library"
          >
            Master Scenario Library →
          </Link>
        </div>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Hospital / Site</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sites.map((s) => (
              <tr key={s.id} data-testid={`smoke-runner:admin-scenarios:row__${s.id.toLowerCase()}`}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="site-mark">{s.id.slice(0, 2).toUpperCase()}</span>
                    <strong>{s.name}</strong>
                  </div>
                </td>
                <td style={{ textAlign: "right" }}>
                  <Link
                    href={`/admin/scenarios/${s.id}`}
                    className="btn btn-sm"
                    data-testid={`smoke-runner:admin-scenarios:link-manage__${s.id.toLowerCase()}`}
                  >
                    Manage Scenarios →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
