import { test, expect } from "../fixtures/auth";
import { E2E_SITE_KEY, E2E_USERS } from "../global-setup";

test.describe("Phase 3 - New Run form", () => {
  test("submitting the form lands on the new Run Detail page with the submitted fields", async ({ adminPage: page }) => {
    await page.goto(`/${E2E_SITE_KEY}/new`);

    await page.getByTestId("smoke-runner:new-run:select__environment").selectOption("UAT");
    await page.getByTestId("smoke-runner:new-run:input__test-cycle").fill("Cycle E2E");
    await page.getByTestId("smoke-runner:new-run:input__version").fill("v9.9.9");
    await page.getByTestId("smoke-runner:new-run:input__hn").fill("HN-E2E-001");

    await Promise.all([
      // Anchored to RUN-{site}-NNNN — a looser `[^/]+$` pattern also matches the *current*
      // "/{site}/new" URL before the click even happens (waitForURL resolves immediately if the
      // page already satisfies it), which would capture the literal string "new" as the id.
      page.waitForURL(new RegExp(`/${E2E_SITE_KEY}/RUN-${E2E_SITE_KEY}-\\d{4}$`)),
      page.getByTestId("smoke-runner:new-run:btn__start").click(),
    ]);

    // Run ID is system-generated (REQ-032) — assert it looks right (RUN-{site}-NNNN) rather than
    // matching a value this test chose, then confirm the rest of the submitted fields landed.
    const runId = decodeURIComponent(new URL(page.url()).pathname.split("/").pop()!);
    expect(runId).toMatch(new RegExp(`^RUN-${E2E_SITE_KEY}-\\d{4}$`));

    await expect(page.locator("h1")).toContainText(runId);
    await expect(page.locator(".page-header .subtitle")).toContainText("UAT");
    await expect(page.locator(".page-header .subtitle")).toContainText("Cycle E2E");
    await expect(page.locator(".page-header .subtitle")).toContainText(E2E_USERS.admin.displayName);
  });

  test("Tester field is locked to the logged-in user, not a free-text input", async ({ adminPage: page }) => {
    await page.goto(`/${E2E_SITE_KEY}/new`);
    const testerField = page.getByTestId("smoke-runner:new-run:input__tester");
    await expect(testerField).toHaveText(E2E_USERS.admin.displayName);
    await expect(testerField).toHaveJSProperty("tagName", "DIV");
  });

  test("Run ID is system-generated and sequential, not user-settable", async ({ adminPage: page }) => {
    // The id input no longer exists on the form at all (REQ-032).
    await page.goto(`/${E2E_SITE_KEY}/new`);
    await expect(page.getByTestId("smoke-runner:new-run:input__run-id")).toHaveCount(0);

    // Two Runs created back to back on the same site get strictly sequential ids.
    await page.goto(`/${E2E_SITE_KEY}/new`);
    await Promise.all([
      // Anchored to RUN-{site}-NNNN — a looser `[^/]+$` pattern also matches the *current*
      // "/{site}/new" URL before the click even happens (waitForURL resolves immediately if the
      // page already satisfies it), which would capture the literal string "new" as the id.
      page.waitForURL(new RegExp(`/${E2E_SITE_KEY}/RUN-${E2E_SITE_KEY}-\\d{4}$`)),
      page.getByTestId("smoke-runner:new-run:btn__start").click(),
    ]);
    const firstId = decodeURIComponent(new URL(page.url()).pathname.split("/").pop()!);
    const firstNum = Number(/(\d{4})$/.exec(firstId)![1]);

    await page.goto(`/${E2E_SITE_KEY}/new`);
    await Promise.all([
      // Anchored to RUN-{site}-NNNN — a looser `[^/]+$` pattern also matches the *current*
      // "/{site}/new" URL before the click even happens (waitForURL resolves immediately if the
      // page already satisfies it), which would capture the literal string "new" as the id.
      page.waitForURL(new RegExp(`/${E2E_SITE_KEY}/RUN-${E2E_SITE_KEY}-\\d{4}$`)),
      page.getByTestId("smoke-runner:new-run:btn__start").click(),
    ]);
    const secondId = decodeURIComponent(new URL(page.url()).pathname.split("/").pop()!);
    const secondNum = Number(/(\d{4})$/.exec(secondId)![1]);

    expect(secondNum).toBe(firstNum + 1);
  });
});
