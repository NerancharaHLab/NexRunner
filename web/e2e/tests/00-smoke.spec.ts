import { test, expect } from "@playwright/test";

test.describe("Phase 0 - foundation smoke check", () => {
  test("unauthenticated visitor is redirected to /login", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("/login");
    await expect(page.getByTestId("smoke-runner:login:input__email")).toBeVisible();
    await expect(page.getByTestId("smoke-runner:login:input__password")).toBeVisible();
    await expect(page.getByTestId("smoke-runner:login:btn__submit")).toBeVisible();
  });

  test("login page renders the brand mark and heading", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator(".top-nav-mark")).toHaveText("ST");
    await expect(page.locator("h1")).toContainText("Smoke Test Runner");
  });
});
