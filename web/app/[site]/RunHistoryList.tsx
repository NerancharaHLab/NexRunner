"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./RunHistoryList.module.css";

export interface RunHistoryItem {
  rowKey: string;
  name: string;
  environment: string;
  testCycle: string;
  executedDate: string;
  tester: string;
  passed: number;
  failed: number;
  blocked: number;
  notrun: number;
  passRatePercent: number;
  gateResult: "READY" | "NOT READY";
}

interface Props {
  siteKey: string;
  runs: RunHistoryItem[];
  /** Environment Catalog names (REQ-024), in display order — used only to order the filter's
   *  option list sensibly; which values actually appear is still derived from `runs` below (a
   *  filter shouldn't offer a value with zero matches). */
  environmentOrder: string[];
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
type GateFilter = "ALL" | "READY" | "NOT READY";

function environmentOptions(runs: RunHistoryItem[], environmentOrder: string[]): string[] {
  const seen = new Set(runs.map((r) => r.environment).filter(Boolean));
  const ordered: string[] = [];
  for (const env of environmentOrder) {
    if (seen.has(env)) {
      ordered.push(env);
      seen.delete(env);
    }
  }
  const rest = [...seen].sort((a, b) => a.localeCompare(b));
  return [...ordered, ...rest];
}

function headline(run: RunHistoryItem): string {
  const named = run.name.trim();
  return named || run.rowKey;
}

export default function RunHistoryList({ siteKey, runs, environmentOrder }: Props) {
  const [search, setSearch] = useState("");
  const [gate, setGate] = useState<GateFilter>("ALL");
  const [environment, setEnvironment] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState(1);

  const envChoices = useMemo(() => environmentOptions(runs, environmentOrder), [runs, environmentOrder]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return runs.filter((run) => {
      if (q) {
        const hay = `${run.rowKey} ${run.name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (gate !== "ALL" && run.gateResult !== gate) return false;
      if (environment && run.environment !== environment) return false;
      if (dateFrom && run.executedDate < dateFrom) return false;
      if (dateTo && run.executedDate > dateTo) return false;
      return true;
    });
  }, [runs, search, gate, environment, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize]
  );

  function resetPage() {
    setPage(1);
  }

  return (
    <div>
      <div className="stats-bar">
        <input
          type="text"
          placeholder="Search by run ID or name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            resetPage();
          }}
          className="stats-bar-search"
          data-testid="smoke-runner:run-history:input__search"
        />
        <span className="stats-bar-count" data-testid="smoke-runner:run-history:text__stats">
          Showing {filtered.length} of {runs.length} Runs
        </span>
      </div>

      <div className={styles.filters}>
        <div className={styles.filter}>
          <label htmlFor="run-history-gate">Gate</label>
          <select
            id="run-history-gate"
            value={gate}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "ALL" || value === "READY" || value === "NOT READY") {
                setGate(value);
                resetPage();
              }
            }}
            data-testid="smoke-runner:run-history:select__gate"
          >
            <option value="ALL">All</option>
            <option value="READY">READY</option>
            <option value="NOT READY">NOT READY</option>
          </select>
        </div>
        <div className={styles.filter}>
          <label htmlFor="run-history-env">Environment</label>
          <select
            id="run-history-env"
            value={environment}
            onChange={(e) => {
              setEnvironment(e.target.value);
              resetPage();
            }}
            data-testid="smoke-runner:run-history:select__environment"
          >
            <option value="">All</option>
            {envChoices.map((env) => (
              <option key={env} value={env}>
                {env}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.filter}>
          <label htmlFor="run-history-date-from">From</label>
          <input
            id="run-history-date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              resetPage();
            }}
            data-testid="smoke-runner:run-history:input__date-from"
          />
        </div>
        <div className={styles.filter}>
          <label htmlFor="run-history-date-to">To</label>
          <input
            id="run-history-date-to"
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              resetPage();
            }}
            data-testid="smoke-runner:run-history:input__date-to"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">—</div>
          No test runs match these filters
        </div>
      ) : (
        paged.map((run) => (
          <Link
            key={run.rowKey}
            href={`/${siteKey}/${run.rowKey}`}
            className="card"
            data-testid={`smoke-runner:run-history:row__${run.rowKey}`}
          >
            <div className={styles.cardHead}>
              <strong
                className={styles.name}
                data-testid={`smoke-runner:run-history:txt__name__${run.rowKey}`}
              >
                {headline(run)}
              </strong>
              <span className={`gate-badge ${run.gateResult === "READY" ? "ready" : "notready"}`}>
                {run.gateResult}
              </span>
            </div>
            <div className={styles.meta}>
              {run.rowKey} · {run.environment} · {run.testCycle} · {run.executedDate} · Tester:{" "}
              {run.tester || "-"}
            </div>
            <div className={`stat-row ${styles.stats}`}>
              <span className="stat-pill pass">✅ {run.passed}</span>
              <span className="stat-pill fail">❌ {run.failed}</span>
              <span className="stat-pill block">🟡 {run.blocked}</span>
              <span className="stat-pill">⚪ {run.notrun}</span>
              <span className="stat-pill">{run.passRatePercent}%</span>
            </div>
          </Link>
        ))
      )}

      {filtered.length > 0 && (
        <div className="pagination-bar">
          <div className="pagination-page-size">
            <label htmlFor="run-history-page-size">Show</label>
            <select
              id="run-history-page-size"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                resetPage();
              }}
              data-testid="smoke-runner:run-history:select__page-size"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>per page</span>
          </div>
          <div className="pagination-controls">
            <button
              type="button"
              className="btn btn-sm"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              data-testid="smoke-runner:run-history:btn__page-prev"
            >
              ← Prev
            </button>
            <span
              className="pagination-status"
              data-testid="smoke-runner:run-history:text__page-status"
            >
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
              data-testid="smoke-runner:run-history:btn__page-next"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
