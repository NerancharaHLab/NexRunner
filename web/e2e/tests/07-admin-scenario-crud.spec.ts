import { test, expect } from "../fixtures/auth";
import { E2E_SITE_KEY } from "../global-setup";
import { stripNonAlnum } from "../helpers/run";

test.describe("Phase 7 - Admin Scenario CRUD", () => {
  test("admin creates, edits, and deletes a scenario", async ({ adminPage: page }) => {
    const scenarioId = `E2E-CRUD-${Date.now()}`;
    const elId = stripNonAlnum(scenarioId);

    await page.goto(`/admin/scenarios/${E2E_SITE_KEY}/new`);
    await page.getByTestId("smoke-runner:admin-scenario-form:input__id").fill(scenarioId);
    await page.getByTestId("smoke-runner:admin-scenario-form:input__name").fill("CRUD Test Scenario");
    await page.getByTestId("smoke-runner:admin-scenario-form:input__role").fill("QA");
    await Promise.all([
      page.waitForURL(`/admin/scenarios/${E2E_SITE_KEY}`),
      page.getByTestId("smoke-runner:admin-scenario-form:btn__save").click(),
    ]);

    const row = page.getByTestId(`smoke-runner:admin-scenarios:row__${elId}`);
    await expect(row).toBeVisible();
    await expect(row).toContainText("CRUD Test Scenario");

    await Promise.all([
      page.waitForURL(`/admin/scenarios/${E2E_SITE_KEY}/${encodeURIComponent(scenarioId)}/edit`),
      page.getByTestId(`smoke-runner:admin-scenarios:btn-edit__${elId}`).click(),
    ]);
    await page.getByTestId("smoke-runner:admin-scenario-form:input__name").fill("CRUD Test Scenario Edited");
    await Promise.all([
      page.waitForURL(`/admin/scenarios/${E2E_SITE_KEY}`),
      page.getByTestId("smoke-runner:admin-scenario-form:btn__save").click(),
    ]);
    await expect(row).toContainText("CRUD Test Scenario Edited");

    await page.getByTestId(`smoke-runner:admin-scenarios:btn-delete__${elId}`).click();
    await expect(row).toHaveCount(0);
  });

  test("qa_engineer is redirected away from /admin/scenarios", async ({ qaEngineerPage: page }) => {
    await page.goto(`/admin/scenarios/${E2E_SITE_KEY}`);
    await page.waitForURL("/");
  });
});
