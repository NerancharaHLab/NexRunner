// Low-churn static config that stayed out of the DB migration (see
// ~/.claude/plans/streamed-wibbling-lamport.md) — moved out of the old
// data/scenarios/sites.json now that hospitals/scenarios live in Azure Table
// Storage instead. Revisit if these start changing often enough to need CRUD.

export const ENVIRONMENTS = [
  "STAGING",
  "UAT",
  "DEVELOPMENT (DEV)",
  "PRE-PROD",
  "PRODUCTION (PROD)",
] as const;

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
