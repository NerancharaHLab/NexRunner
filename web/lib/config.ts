// Static config for pieces that haven't moved into the DB. ENVIRONMENTS used to live here too
// (moved to a real admin-managed catalog — see lib/db/environments-table.ts — REQ-024, 2026-09-02).
//
// DATA_CHAIN_FIELDS below is dead code — never imported anywhere. The real HN/VN/AN/Bill No.
// fields on the New Run / Run Edit forms are hardcoded fixed columns on the Run Prisma model, not
// driven by this array. Left as-is (not deleted, not wired up) pending
// specs/REQ-037_site_configurable_data_chain_schema.md's BA/SA scoping — whether a genuine dynamic
// field schema is worth building, or whether the fixed 4 fields already cover real needs.

export interface DataChainField {
  id: string;
  label: string;
  type: "text" | "date";
  placeholder?: string;
  span?: number;
}

export const DATA_CHAIN_FIELDS: DataChainField[] = [
  { id: "ver", label: "SYSTEM VERSION", type: "text", placeholder: "e.g. v1.0.0", span: 1 },
  {
    id: "delivery",
    label: "DELIVERY BATCH",
    type: "text",
    placeholder: "e.g. D 1 or Batch 1",
    span: 1,
  },
  { id: "runid", label: "RUN ID", type: "text", placeholder: "e.g. SM-RUN-001", span: 1 },
  { id: "cycle", label: "TEST CYCLE", type: "text", placeholder: "e.g. Cycle 1", span: 1 },
  { id: "date", label: "DATE EXECUTED", type: "date", span: 1 },
  {
    id: "tester",
    label: "TESTER NAME",
    type: "text",
    placeholder: "Enter tester name...",
    span: 1,
  },
  { id: "hn", label: "PRIMARY HN", type: "text", placeholder: "e.g. HN 6600001...", span: 1 },
  { id: "vn", label: "PRIMARY VN", type: "text", placeholder: "e.g. VN 6600001...", span: 1 },
  { id: "an", label: "PRIMARY AN", type: "text", placeholder: "e.g. AN 6600001...", span: 1 },
  {
    id: "bill",
    label: "BILL NO. / INV",
    type: "text",
    placeholder: "e.g. INV-660001...",
    span: 1,
  },
];
