"use client";

import { useEffect, useRef, useState } from "react";

export interface FilterOption {
  id: string;
  name: string;
  description?: string;
}

interface Props {
  suites: FilterOption[];
  tags: FilterOption[];
}

type CategoryKey = "suite" | "tagInclude" | "tagExclude";

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  suite: "Suite",
  tagInclude: "Tag — must have",
  tagExclude: "Tag — must not have",
};

function slug(cat: CategoryKey): string {
  if (cat === "tagInclude") return "tag-include";
  if (cat === "tagExclude") return "tag-exclude";
  return "suite";
}

/**
 * Linear/Jira-style step filter picker, replacing the old long Suite/Tag checkbox lists on the
 * New Run form. "+ Filter" -> pick a category -> searchable checklist -> becomes a removable
 * pill. Renders hidden <input>s with the exact same `name`s the old checkboxes used
 * (suite_{id}/tag_include_{id}/tag_exclude_{id}/tagIncludeMode) so startRun's Server Action in
 * page.tsx needs zero changes — this is a pure presentation-layer swap over the same form
 * contract; createRun()/lib/runs.ts are untouched.
 */
export default function FilterPicker({ suites, tags }: Props) {
  const [selectedSuites, setSelectedSuites] = useState<Set<string>>(new Set());
  const [tagInclude, setTagInclude] = useState<Set<string>>(new Set());
  const [tagExclude, setTagExclude] = useState<Set<string>>(new Set());
  const [tagIncludeMode, setTagIncludeMode] = useState<"OR" | "AND">("OR");
  const [showMenu, setShowMenu] = useState(false);
  const [openCategory, setOpenCategory] = useState<CategoryKey | null>(null);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setOpenCategory(null);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showMenu]);

  function optionsFor(category: CategoryKey): FilterOption[] {
    return category === "suite" ? suites : tags;
  }
  function selectedSetFor(category: CategoryKey): Set<string> {
    if (category === "suite") return selectedSuites;
    return category === "tagInclude" ? tagInclude : tagExclude;
  }
  function setterFor(category: CategoryKey): (s: Set<string>) => void {
    if (category === "suite") return setSelectedSuites;
    return category === "tagInclude" ? setTagInclude : setTagExclude;
  }

  function toggleOption(category: CategoryKey, id: string) {
    const next = new Set(selectedSetFor(category));
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setterFor(category)(next);
  }

  function clearCategory(category: CategoryKey) {
    setterFor(category)(new Set());
  }

  function openCategoryPanel(category: CategoryKey) {
    setOpenCategory(category);
    setSearch("");
    setShowMenu(true);
  }

  if (suites.length === 0 && tags.length === 0) {
    return (
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
        No Suites or Tags yet — create some in Manage Suites / Manage Tags to filter this Run by
        them. Leaving this empty tests every Scenario for the site.
      </p>
    );
  }

  const pills: { key: CategoryKey; label: string }[] = [];
  if (selectedSuites.size > 0) {
    pills.push({
      key: "suite",
      label: `Suite: ${suites.filter((s) => selectedSuites.has(s.id)).map((s) => s.name).join(", ")}`,
    });
  }
  if (tagInclude.size > 0) {
    pills.push({
      key: "tagInclude",
      label: `Must have: ${tags.filter((t) => tagInclude.has(t.id)).map((t) => t.name).join(", ")} (${tagIncludeMode})`,
    });
  }
  if (tagExclude.size > 0) {
    pills.push({
      key: "tagExclude",
      label: `Must not have: ${tags.filter((t) => tagExclude.has(t.id)).map((t) => t.name).join(", ")}`,
    });
  }

  const filteredOptions = openCategory
    ? optionsFor(openCategory).filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <div className="filter-picker" ref={rootRef}>
      <div className="filter-picker-pills">
        {pills.map((pill) => (
          <span key={pill.key} className="filter-pill" data-testid={`smoke-runner:new-run:filter-pill__${slug(pill.key)}`}>
            <button type="button" className="filter-pill-label" onClick={() => openCategoryPanel(pill.key)}>
              {pill.label}
            </button>
            <button
              type="button"
              className="filter-pill-remove"
              onClick={() => clearCategory(pill.key)}
              aria-label={`Clear ${CATEGORY_LABELS[pill.key]} filter`}
              data-testid={`smoke-runner:new-run:filter-pill-remove__${slug(pill.key)}`}
            >
              ✕
            </button>
          </span>
        ))}
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            // Always land on the category list, never toggle closed — if the panel was already
            // open on a checklist (e.g. right after picking a Suite), clicking "+ Filter" again
            // should reset to the category list, not close the panel. Click-outside already
            // handles closing.
            setShowMenu(true);
            setOpenCategory(null);
          }}
          data-testid="smoke-runner:new-run:btn__add-filter"
        >
          + Filter
        </button>
      </div>

      {showMenu && (
        <div className="filter-picker-panel">
          {openCategory === null ? (
            (Object.keys(CATEGORY_LABELS) as CategoryKey[]).map((cat) => (
              <button
                key={cat}
                type="button"
                className="filter-category-row"
                onClick={() => openCategoryPanel(cat)}
                data-testid={`smoke-runner:new-run:filter-category__${slug(cat)}`}
              >
                {CATEGORY_LABELS[cat]}
                {selectedSetFor(cat).size > 0 && <span className="stat-pill">{selectedSetFor(cat).size}</span>}
              </button>
            ))
          ) : (
            <>
              <button type="button" className="filter-back-link" onClick={() => setOpenCategory(null)}>
                ← Back
              </button>
              {openCategory === "tagInclude" && (
                <div className="filter-mode-toggle">
                  <label>
                    <input
                      type="radio"
                      name="filterTagIncludeMode"
                      checked={tagIncludeMode === "OR"}
                      onChange={() => setTagIncludeMode("OR")}
                    />
                    Any (OR)
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="filterTagIncludeMode"
                      checked={tagIncludeMode === "AND"}
                      onChange={() => setTagIncludeMode("AND")}
                    />
                    All (AND)
                  </label>
                </div>
              )}
              <input
                type="text"
                className="filter-search-input"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="smoke-runner:new-run:filter-search-input"
                autoFocus
              />
              <div className="filter-checklist">
                {filteredOptions.length === 0 && <p className="filter-empty">No matches</p>}
                {filteredOptions.map((opt) => (
                  <label key={opt.id} className="filter-checklist-row">
                    <input
                      type="checkbox"
                      checked={selectedSetFor(openCategory).has(opt.id)}
                      onChange={() => toggleOption(openCategory, opt.id)}
                      data-testid={`smoke-runner:new-run:filter-option__${slug(openCategory)}__${opt.id}`}
                    />
                    {opt.name}
                    {opt.description && <span className="filter-option-desc"> — {opt.description}</span>}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {[...selectedSuites].map((id) => (
        <input key={id} type="hidden" name={`suite_${id}`} value="on" />
      ))}
      {[...tagInclude].map((id) => (
        <input key={id} type="hidden" name={`tag_include_${id}`} value="on" />
      ))}
      {[...tagExclude].map((id) => (
        <input key={id} type="hidden" name={`tag_exclude_${id}`} value="on" />
      ))}
      <input type="hidden" name="tagIncludeMode" value={tagIncludeMode} />
    </div>
  );
}
