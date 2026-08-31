import { test, expect } from "../fixtures/auth";
import { E2E_SITE_KEY, E2E_SITE_NAME } from "../global-setup";
import { createRunViaUI } from "../helpers/run";

test.describe("Phase 6 - Linear Report modal, Executive Report page, print media", () => {
  test("Linear Report modal text reflects the run's actual data", async ({ adminPage: page }) => {
    const runId = await createRunViaUI(page, E2E_SITE_KEY);

    await page.getByTestId("smoke-runner:run-detail:btn__open-linear-report").click();
    const modal = page.getByTestId("smoke-runner:linear-report:modal__dialog");
    await expect(modal).toBeVisible();

    const text = await page.getByTestId("smoke-runner:linear-report:input__output").inputValue();
    expect(text).toContain(E2E_SITE_NAME);
    expect(text).toContain(runId);
    expect(text).toContain("NOT READY"); // all scenarios start Not Run, so the gate can't be ready
    expect(text).toContain("Not Run: 3 Scenarios");

    await page.getByTestId("smoke-runner:linear-report:btn__close").click();
    await expect(modal).toBeHidden();
  });

  test("Executive Report page KPIs and gate banner match the run, and print media hides chrome", async ({
    adminPage: page,
  }) => {
    const runId = await createRunViaUI(page, E2E_SITE_KEY);

    await Promise.all([
      page.waitForURL(`/${E2E_SITE_KEY}/${runId}/executive-report`),
      page.getByTestId("smoke-runner:run-detail:link__executive-report").click(),
    ]);

    await expect(page.getByTestId("smoke-runner:executive-report:banner__gate")).toHaveClass(/rejected/);
    const kpiCards = page.locator(".kpi-grid .kpi-card .num");
    await expect(kpiCards.nth(0)).toHaveText("0"); // passed
    await expect(kpiCards.nth(3)).toHaveText("3"); // not run

    // Screen media: TopNav and the toolbar are visible.
    await expect(page.locator(".top-nav")).toBeVisible();

    // Print media: no-print elements (TopNav, breadcrumb+print toolbar) disappear.
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".top-nav")).toBeHidden();
    await expect(page.locator(".report-toolbar")).toBeHidden();
    await expect(page.locator(".report-paper")).toBeVisible();
  });
});
