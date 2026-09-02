"use client";

// Shared grouping/search logic for the Master Scenario Library and Clone-from-Master pages — one
// place for FR-01/02/03 (group definitions, search matching, auto-expand-on-search) so both pages
// behave identically. Plain React local state per the agreed constraint (no new dependency, no
// global store — the scenario counts here are in the tens/low hundreds, not a case for anything
// heavier).
import { useMemo, useState } from "react";
import type { ScenarioDef } from "@/lib/types";

export type GroupBy = "flow" | "sourceSite" | "none";

export interface ScenarioGroup {
  key: string;
  label: string;
  scenarios: ScenarioDef[];
  criticalCount: number;
}

// Fixed reading order (not alphabetical) — matches the SRS wireframe's OPD -> IPD -> General flow.
const FLOW_GROUPS: { key: ScenarioDef["flow"]; label: string }[] = [
  { key: "OPD", label: "OPD Journey" },
  { key: "IPD", label: "IPD Journey" },
  { key: "General", label: "General & Supporting" },
];

function matchesSearch(sc: ScenarioDef, q: string): boolean {
  const haystack = [sc.id, sc.name, sc.steps, sc.criteria, ...(sc.tags ?? [])].join(" ").toLowerCase();
  return haystack.includes(q);
}

function buildGroups(scenarios: ScenarioDef[], groupBy: GroupBy): ScenarioGroup[] {
  if (groupBy === "none") {
    return [
      {
        key: "all",
        label: "All Scenarios",
        scenarios: [...scenarios].sort((a, b) => a.id.localeCompare(b.id)),
        criticalCount: scenarios.filter((s) => s.critical).length,
      },
    ];
  }
  if (groupBy === "sourceSite") {
    const bySite = new Map<string, ScenarioDef[]>();
    for (const sc of scenarios) {
      const list = bySite.get(sc.sourceSite) ?? [];
      list.push(sc);
      bySite.set(sc.sourceSite, list);
    }
    return [...bySite.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([site, list]) => ({
        key: site,
        label: site,
        scenarios: list,
        criticalCount: list.filter((s) => s.critical).length,
      }));
  }
  // groupBy === "flow"
  return FLOW_GROUPS.map((g) => {
    const list = scenarios.filter((s) => s.flow === g.key);
    return { key: g.key, label: g.label, scenarios: list, criticalCount: list.filter((s) => s.critical).length };
  }).filter((g) => g.scenarios.length > 0);
}

export function useScenarioGrouping(scenarios: ScenarioDef[], groupBy: GroupBy, search: string) {
  const [manualExpanded, setManualExpanded] = useState<Record<string, boolean>>({});
  const groups = useMemo(() => buildGroups(scenarios, groupBy), [scenarios, groupBy]);

  const q = search.trim().toLowerCase();
  const isSearching = q.length > 0;

  const visibleGroups = useMemo(() => {
    if (!isSearching) return groups;
    return groups
      .map((g) => ({ ...g, scenarios: g.scenarios.filter((s) => matchesSearch(s, q)) }))
      .filter((g) => g.scenarios.length > 0);
  }, [groups, isSearching, q]);

  function isExpanded(key: string): boolean {
    // Search-mode: every visible group (i.e. it has >=1 match, or it wouldn't be in
    // visibleGroups at all) is force-expanded — the manual state underneath is left alone and
    // reasserts itself the instant search is cleared.
    if (isSearching) return true;
    return manualExpanded[key] ?? true; // default open — small counts today, matches the wireframe
  }

  function toggleGroup(key: string) {
    setManualExpanded((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  }

  return { groups: visibleGroups, isExpanded, toggleGroup, isSearching };
}
