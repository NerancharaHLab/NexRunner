import type { Page } from "@playwright/test";

/**
 * Creates a Run via the real New Run form and lands on its Run Detail page. Returns the Run ID —
 * system-generated since REQ-032 (RUN-{siteKey}-0001, sequential, never client-supplied), so this
 * can no longer set/predict it up front; it's read back out of the URL Playwright actually lands
 * on after submit.
 */
export async function createRunViaUI(page: Page, siteKey: string, name?: string): Promise<string> {
  await page.goto(`/${siteKey}/new`);
  if (name) {
    await page.getByTestId("smoke-runner:new-run:input__name").fill(name);
  }
  await Promise.all([
    // Anchored to the RUN-{site}-NNNN shape specifically — a looser `[^/]+$` pattern would also
    // match the *current* "/{site}/new" URL before the click even happens (waitForURL resolves
    // immediately if the page already satisfies it), capturing the literal string "new" as if it
    // were the generated id.
    page.waitForURL(new RegExp(`/${siteKey}/RUN-${siteKey}-\\d{4}$`)),
    page.getByTestId("smoke-runner:new-run:btn__start").click(),
  ]);
  const match = /\/[^/]+\/([^/]+)$/.exec(new URL(page.url()).pathname);
  if (!match) throw new Error(`createRunViaUI: couldn't parse Run ID out of URL ${page.url()}`);
  return decodeURIComponent(match[1]);
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
