import { test, expect } from "../fixtures/auth";
import { E2E_SITE_KEY, E2E_SITE_NAME } from "../global-setup";
import { createRunViaUI } from "../helpers/run";

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

  test("named run shows its name as the card headline and is findable by search", async ({ adminPage: page }) => {
    const uniqueName = `REQ-025 history ${Date.now()}`;
    const runId = await createRunViaUI(page, E2E_SITE_KEY, uniqueName);

    await page.goto(`/${E2E_SITE_KEY}`);
    const nameEl = page.getByTestId(`smoke-runner:run-history:txt__name__${runId}`);
    await expect(nameEl).toHaveText(uniqueName);
    await expect(page.getByTestId(`smoke-runner:run-history:row__${runId}`)).toContainText(runId);

    await page.getByTestId("smoke-runner:run-history:input__search").fill(uniqueName);
    await expect(page.getByTestId(`smoke-runner:run-history:row__${runId}`)).toBeVisible();
    await expect(page.getByTestId("smoke-runner:run-history:text__stats")).toContainText("Showing 1 of");

    await page.getByTestId("smoke-runner:run-history:input__search").fill("no-such-run-zzzz");
    await expect(page.getByTestId(`smoke-runner:run-history:row__${runId}`)).toHaveCount(0);
    await expect(page.getByText("No test runs match these filters")).toBeVisible();
  });

  test("a run without a name uses the system id as the card headline", async ({ adminPage: page }) => {
    const runId = await createRunViaUI(page, E2E_SITE_KEY);
    await page.goto(`/${E2E_SITE_KEY}`);
    await page.getByTestId("smoke-runner:run-history:input__search").fill(runId);
    await expect(page.getByTestId(`smoke-runner:run-history:txt__name__${runId}`)).toHaveText(runId);
  });

  test("gate filter hides NOT READY runs when READY is selected, and pagination controls render", async ({
    adminPage: page,
  }) => {
    const uniqueName = `REQ-025 gate ${Date.now()}`;
    const runId = await createRunViaUI(page, E2E_SITE_KEY, uniqueName);
    await page.goto(`/${E2E_SITE_KEY}`);

    await expect(page.getByTestId("smoke-runner:run-history:select__gate")).toBeVisible();
    await expect(page.getByTestId("smoke-runner:run-history:select__page-size")).toHaveValue("10");
    await expect(page.getByTestId("smoke-runner:run-history:text__page-status")).toContainText("Page 1 of");

    await page.getByTestId("smoke-runner:run-history:input__search").fill(uniqueName);
    await expect(page.getByTestId(`smoke-runner:run-history:row__${runId}`)).toBeVisible();

    await page.getByTestId("smoke-runner:run-history:select__gate").selectOption("READY");
    await expect(page.getByTestId(`smoke-runner:run-history:row__${runId}`)).toHaveCount(0);

    await page.getByTestId("smoke-runner:run-history:select__gate").selectOption("NOT READY");
    await expect(page.getByTestId(`smoke-runner:run-history:row__${runId}`)).toBeVisible();
  });
});
