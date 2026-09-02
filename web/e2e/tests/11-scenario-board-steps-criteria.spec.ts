import { test, expect } from "../fixtures/auth";
import { E2E_SITE_KEY, E2E_SCENARIOS } from "../global-setup";
import { createRunViaUI, cleanId } from "../helpers/run";

const ID_1 = cleanId("E2E-SC-01");
const ID_2 = cleanId("E2E-SC-02");
const SCENARIO_1 = E2E_SCENARIOS[0];

test.describe("Phase 11 - Scenario Board Steps & Criteria expand/collapse (REQ-040)", () => {
  test("per-card toggle expands/collapses independently and shows real Steps/Criteria content", async ({
    adminPage: page,
  }) => {
    await createRunViaUI(page, E2E_SITE_KEY);

    // Collapsed by default.
    await expect(page.locator('[data-testid^="smoke-runner:scenario-item:detail-steps__"]')).toHaveCount(0);

    await page.getByTestId(`smoke-runner:scenario-item:btn-toggle-steps__${ID_1}`).click();
    await expect(page.locator('[data-testid^="smoke-runner:scenario-item:detail-steps__"]')).toHaveCount(1);
    const detail1 = page.getByTestId(`smoke-runner:scenario-item:detail-steps__${ID_1}`);
    await expect(detail1).toBeVisible();
    await expect(detail1.locator(".scenario-steps-box")).toContainText(SCENARIO_1.steps);
    await expect(detail1.locator(".scenario-criteria-box")).toContainText(SCENARIO_1.criteria);

    // Expanding a second card doesn't collapse the first — independent per-card state.
    await page.getByTestId(`smoke-runner:scenario-item:btn-toggle-steps__${ID_2}`).click();
    await expect(page.locator('[data-testid^="smoke-runner:scenario-item:detail-steps__"]')).toHaveCount(2);

    // Collapsing the first leaves the second open.
    await page.getByTestId(`smoke-runner:scenario-item:btn-toggle-steps__${ID_1}`).click();
    await expect(page.locator('[data-testid^="smoke-runner:scenario-item:detail-steps__"]')).toHaveCount(1);
    await expect(page.getByTestId(`smoke-runner:scenario-item:detail-steps__${ID_2}`)).toBeVisible();
  });

  test("toggle still works on a locked Run (view-only, not gated)", async ({ adminPage: page }) => {
    await createRunViaUI(page, E2E_SITE_KEY);

    await page.getByTestId("smoke-runner:run-detail:btn__lock-run").click();
    await page.getByTestId("smoke-runner:lock-confirm:btn__confirm").click();
    await expect(page.getByTestId("smoke-runner:run-detail:badge__locked")).toBeVisible();

    await page.getByTestId(`smoke-runner:scenario-item:btn-toggle-steps__${ID_1}`).click();
    await expect(page.getByTestId(`smoke-runner:scenario-item:detail-steps__${ID_1}`)).toBeVisible();

    // Unlock again so this doesn't leave a locked ad-hoc Run behind — every other e2e-created Run
    // in this suite stays unlocked, matching that convention.
    await page.getByTestId("smoke-runner:run-detail:btn__unlock-run").click();
    await page.getByTestId("smoke-runner:unlock-confirm:input__reason").fill("e2e test cleanup");
    await page.getByTestId("smoke-runner:unlock-confirm:btn__confirm").click();
    await expect(page.getByTestId("smoke-runner:run-detail:btn__lock-run")).toBeVisible();
  });
});
