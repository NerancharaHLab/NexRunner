import { test, expect } from "../fixtures/auth";
import { E2E_SITE_KEY } from "../global-setup";

test.describe("Phase 7 - Admin Scenario CRUD", () => {
  test("admin creates, edits, and deletes a scenario", async ({ adminPage: page }) => {
    // Scenario ID is system-generated ({SITE}-CUST-0001, REQ-032) — the id input no longer exists
    // on the Create form, so the new row is found by its Name text instead of a predicted id.
    await page.goto(`/admin/scenarios/${E2E_SITE_KEY}/new`);
    await expect(page.getByTestId("smoke-runner:admin-scenario-form:input__id")).toHaveCount(0);
    await page.getByTestId("smoke-runner:admin-scenario-form:input__name").fill("CRUD Test Scenario");
    await page.getByTestId("smoke-runner:admin-scenario-form:input__role").fill("QA");
    await Promise.all([
      page.waitForURL(`/admin/scenarios/${E2E_SITE_KEY}`),
      page.getByTestId("smoke-runner:admin-scenario-form:btn__save").click(),
    ]);

    const row = page.locator('[data-testid^="smoke-runner:admin-scenarios:row__"]', {
      hasText: "CRUD Test Scenario",
    });
    await expect(row).toBeVisible();
    // The row displays the generated id as <strong>{sc.id}</strong> — read it back from there.
    const scenarioId = await row.locator("strong").first().textContent();
    expect(scenarioId).toMatch(new RegExp(`^${E2E_SITE_KEY}-CUST-\\d{4}$`));

    await Promise.all([
      page.waitForURL(new RegExp(`/admin/scenarios/${E2E_SITE_KEY}/[^/]+/edit$`)),
      row.locator('[data-testid^="smoke-runner:admin-scenarios:btn-edit__"]').click(),
    ]);
    // Edit form's id field is now a read-only display (REQ-032), not an editable input.
    await expect(page.getByTestId("smoke-runner:admin-scenario-form:input__id")).toContainText(
      new RegExp(`^${E2E_SITE_KEY}-CUST-\\d{4}$`)
    );
    await page.getByTestId("smoke-runner:admin-scenario-form:input__name").fill("CRUD Test Scenario Edited");
    await Promise.all([
      page.waitForURL(`/admin/scenarios/${E2E_SITE_KEY}`),
      page.getByTestId("smoke-runner:admin-scenario-form:btn__save").click(),
    ]);
    const editedRow = page.locator('[data-testid^="smoke-runner:admin-scenarios:row__"]', {
      hasText: "CRUD Test Scenario Edited",
    });
    await expect(editedRow).toBeVisible();

    await editedRow.locator('[data-testid^="smoke-runner:admin-scenarios:btn-delete__"]').click();
    await expect(editedRow).toHaveCount(0);
  });

  test("qa_engineer is redirected away from /admin/scenarios", async ({ qaEngineerPage: page }) => {
    await page.goto(`/admin/scenarios/${E2E_SITE_KEY}`);
    await page.waitForURL("/");
  });
});
