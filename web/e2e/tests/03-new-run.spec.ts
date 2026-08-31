import { test, expect } from "../fixtures/auth";
import { E2E_SITE_KEY, E2E_USERS } from "../global-setup";

test.describe("Phase 3 - New Run form", () => {
  test("submitting the form lands on the new Run Detail page with the submitted fields", async ({ adminPage: page }) => {
    const runId = `E2E-RUN-${Date.now()}`;
    await page.goto(`/${E2E_SITE_KEY}/new`);

    await page.getByTestId("smoke-runner:new-run:input__run-id").fill(runId);
    await page.getByTestId("smoke-runner:new-run:select__environment").selectOption("UAT");
    await page.getByTestId("smoke-runner:new-run:input__test-cycle").fill("Cycle E2E");
    await page.getByTestId("smoke-runner:new-run:input__version").fill("v9.9.9");
    await page.getByTestId("smoke-runner:new-run:input__hn").fill("HN-E2E-001");

    await Promise.all([
      page.waitForURL(`/${E2E_SITE_KEY}/${runId}`),
      page.getByTestId("smoke-runner:new-run:btn__start").click(),
    ]);

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

  test("duplicate Run ID is rejected with an error banner", async ({ adminPage: page }) => {
    const runId = `E2E-RUN-DUP-${Date.now()}`;

    // First creation succeeds.
    await page.goto(`/${E2E_SITE_KEY}/new`);
    await page.getByTestId("smoke-runner:new-run:input__run-id").fill(runId);
    await Promise.all([
      page.waitForURL(`/${E2E_SITE_KEY}/${runId}`),
      page.getByTestId("smoke-runner:new-run:btn__start").click(),
    ]);

    // Second creation with the same Run ID is rejected.
    await page.goto(`/${E2E_SITE_KEY}/new`);
    await page.getByTestId("smoke-runner:new-run:input__run-id").fill(runId);
    await page.getByTestId("smoke-runner:new-run:btn__start").click();
    await page.waitForURL(/error=/);
    await expect(page.locator(".error-banner")).toBeVisible();
    await expect(page.locator(".error-banner")).toContainText(runId);
  });
});
