"use client";

import { useMemo, useState } from "react";

export interface TagRow {
  id: string;
  name: string;
  usageCount: number;
}

interface Props {
  tags: TagRow[];
  deleteAction: (formData: FormData) => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
type SortKey = "name" | "usageCount";
type SortDir = "asc" | "desc";

/**
 * REQ-035: search + stats bar + pill styling + safe-delete guard + pagination + column sort for
 * the Manage Tags page. app/admin/tags/page.tsx stays the Server Component (data fetch + the
 * delete Server Action itself); this only owns client-side interaction — same split as
 * FilterPicker.tsx on the New Run form.
 */
export default function TagsTable({ tags, deleteAction }: Props) {
  const [search, setSearch] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<TagRow | null>(null);
  const [blockedTarget, setBlockedTarget] = useState<TagRow | null>(null);
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState(1); // 1-indexed
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [search, tags]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === "usageCount") return (a.usageCount - b.usageCount) * dir;
      return a.name.localeCompare(b.name) * dir;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  // Clamp instead of a useEffect — filtering/page-size changes can leave `page` past the new last
  // page (e.g. search narrows results while on page 3); render the closest valid page immediately
  // rather than flashing a blank page for one render first.
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sorted, currentPage, pageSize]
  );

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1); // a new search result set starts back at page 1
  }

  function handlePageSize(size: number) {
    setPageSize(size);
    setPage(1);
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function sortIndicator(key: SortKey) {
    if (key !== sortKey) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  const inUseCount = tags.filter((t) => t.usageCount > 0).length;

  return (
    <div>
      <div className="stats-bar">
        <input
          type="text"
          placeholder="Search tags..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="stats-bar-search"
          data-testid="smoke-runner:admin-tags:input__search"
        />
        <span className="stats-bar-count" data-testid="smoke-runner:admin-tags:text__stats">
          Total: {tags.length} Tags · {inUseCount} Active
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">No Tags match &quot;{search}&quot;</div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th
                  className="sortable-header"
                  onClick={() => handleSort("name")}
                  data-testid="smoke-runner:admin-tags:header__name"
                >
                  Tag Name{sortIndicator("name")}
                </th>
                <th
                  className="sortable-header"
                  onClick={() => handleSort("usageCount")}
                  data-testid="smoke-runner:admin-tags:header__usage"
                >
                  Usage (Master Scenarios){sortIndicator("usageCount")}
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((tag) => (
                <tr key={tag.id} data-testid={`smoke-runner:admin-tags:row__${tag.id}`}>
                  <td>
                    <span className="tag-pill">{tag.name}</span>
                  </td>
                  <td>{tag.usageCount} scenario{tag.usageCount === 1 ? "" : "s"}</td>
                  <td style={{ textAlign: "right" }}>
                    {tag.usageCount > 0 ? (
                      // Deliberately NOT a native disabled <button> — a disabled element never
                      // fires onClick in real browsers, which would make it impossible to open the
                      // "why can't I delete this" modal. Styled to *look* blocked instead
                      // (.btn-danger-text--blocked) while staying genuinely clickable.
                      <button
                        type="button"
                        className="btn-danger-text btn-danger-text--blocked"
                        title={`Cannot delete: used by ${tag.usageCount} scenario${tag.usageCount === 1 ? "" : "s"}`}
                        onClick={() => setBlockedTarget(tag)}
                        data-testid={`smoke-runner:admin-tags:btn-delete__${tag.id}`}
                      >
                        Delete
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-danger-text"
                        onClick={() => setConfirmTarget(tag)}
                        data-testid={`smoke-runner:admin-tags:btn-delete__${tag.id}`}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="pagination-bar">
          <div className="pagination-page-size">
            <label htmlFor="tags-page-size">Show</label>
            <select
              id="tags-page-size"
              value={pageSize}
              onChange={(e) => handlePageSize(Number(e.target.value))}
              data-testid="smoke-runner:admin-tags:select__page-size"
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
              data-testid="smoke-runner:admin-tags:btn__page-prev"
            >
              ← Prev
            </button>
            <span className="pagination-status" data-testid="smoke-runner:admin-tags:text__page-status">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
              data-testid="smoke-runner:admin-tags:btn__page-next"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {confirmTarget && (
        <div
          className="modal-overlay"
          data-testid="smoke-runner:admin-tags:modal__delete-confirm"
          onClick={() => setConfirmTarget(null)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Tag?</h3>
            </div>
            <p>
              Delete the tag <span className="tag-pill">{confirmTarget.name}</span>? This cannot be
              undone.
            </p>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setConfirmTarget(null)}
                data-testid="smoke-runner:admin-tags:btn__cancel-delete"
              >
                Cancel
              </button>
              <form action={deleteAction}>
                <input type="hidden" name="id" value={confirmTarget.id} />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  data-testid="smoke-runner:admin-tags:btn__confirm-delete"
                >
                  Yes, Delete
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {blockedTarget && (
        <div
          className="modal-overlay"
          data-testid="smoke-runner:admin-tags:modal__delete-blocked"
          onClick={() => setBlockedTarget(null)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cannot Delete Tag</h3>
            </div>
            <p>
              Tag นี้กำลังถูกใช้งานอยู่ใน {blockedTarget.usageCount} Master Scenarios
              <br />
              กรุณาปลด Tag นี้ออกจาก Scenario ที่เกี่ยวข้องทั้งหมดก่อนจึงจะสามารถลบได้
            </p>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setBlockedTarget(null)}
                data-testid="smoke-runner:admin-tags:btn__dismiss-blocked"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
