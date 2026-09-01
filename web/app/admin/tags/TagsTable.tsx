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

/**
 * REQ-035: search + stats bar + pill styling + safe-delete guard for the Manage Tags page.
 * app/admin/tags/page.tsx stays the Server Component (data fetch + the delete Server Action
 * itself); this only owns client-side interaction — same split as FilterPicker.tsx on the New Run
 * form.
 */
export default function TagsTable({ tags, deleteAction }: Props) {
  const [search, setSearch] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<TagRow | null>(null);
  const [blockedTarget, setBlockedTarget] = useState<TagRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [search, tags]);

  const inUseCount = tags.filter((t) => t.usageCount > 0).length;

  return (
    <div>
      <div className="stats-bar">
        <input
          type="text"
          placeholder="Search tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
                <th>Tag Name</th>
                <th>Usage (Master Scenarios)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tag) => (
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
