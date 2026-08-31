import { test, expect } from "../fixtures/auth";
import { E2E_SITE_KEY, E2E_SITE_NAME } from "../global-setup";

test.describe("Phase 2 - Site picker and Run history", () => {
  test("the seeded E2E site tile appears on the picker and links into it", async ({ adminPage: page }) => {
    await page.goto("/");
    const tile = page.getByTestId(`smoke-runner:site-picker:tile__${E2E_SITE_KEY.toLowerCase()}`);
    await expect(tile).toBeVisible();
    await expect(tile).toContainText(E2E_SITE_NAME);

    await Promise.all([page.waitForURL(`/${E2E_SITE_KEY}`), tile.click()]);
    await expect(page.locator("h1")).toContainText(E2E_SITE_NAME);
  });

  test("Run history page shows the '+ new run' action and a run count", async ({ adminPage: page }) => {
    await page.goto(`/${E2E_SITE_KEY}`);
    await expect(page.getByTestId("smoke-runner:run-history:btn__new-run")).toBeVisible();
    await expect(page.locator(".page-header .subtitle")).toContainText("Test Runs");
  });
});
