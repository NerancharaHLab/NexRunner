import type { Page } from "@playwright/test";

/** Creates a Run via the real New Run form and lands on its Run Detail page. Returns the Run ID. */
export async function createRunViaUI(page: Page, siteKey: string, runIdPrefix = "E2E-RUN"): Promise<string> {
  const runId = `${runIdPrefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  await page.goto(`/${siteKey}/new`);
  await page.getByTestId("smoke-runner:new-run:input__run-id").fill(runId);
  await Promise.all([
    page.waitForURL(`/${siteKey}/${runId}`),
    page.getByTestId("smoke-runner:new-run:btn__start").click(),
  ]);
  return runId;
}

/** cleanId() from ScenarioBoard.tsx — scenario ids are stripped to alnum + lowercased for element ids. */
export function cleanId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

/**
 * The admin Scenario pages (app/admin/scenarios/**) sanitize ids the same
 * way but WITHOUT lowercasing (`sc.id.replace(/[^a-zA-Z0-9]/g, "")`) — a
 * different convention from ScenarioBoard's cleanId() above. Keep them
 * separate rather than reusing one, so a test targeting the wrong page's
 * element ids fails loudly instead of silently matching the wrong node.
 */
export function stripNonAlnum(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "");
}
