"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export interface ManageMenuLink {
  href: string;
  label: string;
  testid: string;
}

/**
 * Groups the "Manage ..." admin links (Scenarios/Sites/Users) behind one dropdown instead of
 * flat top-level links in TopNav — added once a 3rd link (Manage Sites) made the flat row
 * cramped. TopNav itself stays a Server Component (it needs getCurrentUser() server-side); this
 * is split out as the one client-interactive piece, same pattern as ScenarioBoard/
 * LinearReportModal elsewhere in the app.
 */
export default function ManageMenu({ links }: { readonly links: ManageMenuLink[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  if (links.length === 0) return null;

  return (
    <div className="manage-menu" ref={rootRef}>
      <button
        type="button"
        className="manage-menu-btn"
        onClick={() => setOpen((o) => !o)}
        data-testid="smoke-runner:top-nav:btn__manage-menu"
      >
        Manage <span className="manage-menu-caret">▾</span>
      </button>
      {open && (
        <div className="manage-menu-panel">
          {links.map((link) => (
            <Link key={link.href} href={link.href} data-testid={link.testid} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
