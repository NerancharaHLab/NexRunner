import { test, expect } from "../fixtures/auth";
import { E2E_SITE_KEY } from "../global-setup";
import { createRunViaUI } from "../helpers/run";

test.describe("Phase 5 - Edit Run metadata + role gating", () => {
  test("admin edits Environment/Test Cycle/HN and Run Detail reflects the new values", async ({ adminPage: page }) => {
    const runId = await createRunViaUI(page, E2E_SITE_KEY);

    await expect(page.getByTestId("smoke-runner:run-detail:link__edit-run")).toBeVisible();
    await Promise.all([
      page.waitForURL(`/${E2E_SITE_KEY}/${runId}/edit`),
      page.getByTestId("smoke-runner:run-detail:link__edit-run").click(),
    ]);

    await page.getByTestId("smoke-runner:run-edit:select__environment").selectOption("PRE-PROD");
    await page.getByTestId("smoke-runner:run-edit:input__test-cycle").fill("Cycle Edited");
    await page.getByTestId("smoke-runner:run-edit:input__hn").fill("HN-EDITED-777");

    await Promise.all([
      page.waitForURL(`/${E2E_SITE_KEY}/${runId}`),
      page.getByTestId("smoke-runner:run-edit:btn__save").click(),
    ]);

    await expect(page.locator(".page-header .subtitle")).toContainText("PRE-PROD");
    await expect(page.locator(".page-header .subtitle")).toContainText("Cycle Edited");
  });

  test("qa_engineer does not see the edit link and is redirected away from the edit URL directly", async ({
    adminPage,
    qaEngineerPage,
  }) => {
    const runId = await createRunViaUI(adminPage, E2E_SITE_KEY);

    await qaEngineerPage.goto(`/${E2E_SITE_KEY}/${runId}`);
    await expect(qaEngineerPage.getByTestId("smoke-runner:run-detail:link__edit-run")).toHaveCount(0);

    await qaEngineerPage.goto(`/${E2E_SITE_KEY}/${runId}/edit`);
    await qaEngineerPage.waitForURL("/");
  });
});
