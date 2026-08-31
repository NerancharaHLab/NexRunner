import { test, expect } from "../fixtures/auth";
import { E2E_USERS } from "../global-setup";

test.describe("Phase 1 - Login, logout, role-conditional nav", () => {
  test("valid credentials log in and land on the site picker", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("smoke-runner:login:input__email").fill(E2E_USERS.admin.email);
    await page.getByTestId("smoke-runner:login:input__password").fill(E2E_USERS.admin.password);
    await Promise.all([
      page.waitForURL("/"),
      page.getByTestId("smoke-runner:login:btn__submit").click(),
    ]);
    await expect(page.locator("h1")).toContainText("Smoke Test Runner");
    await expect(page.locator(".user-chip")).toContainText(E2E_USERS.admin.displayName);
  });

  test("wrong password shows an error and stays on /login", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("smoke-runner:login:input__email").fill(E2E_USERS.admin.email);
    await page.getByTestId("smoke-runner:login:input__password").fill("definitely-wrong-password");
    await page.getByTestId("smoke-runner:login:btn__submit").click();
    await page.waitForURL(/error=/);
    await expect(page.locator(".error-banner")).toBeVisible();
  });

  test("logout clears the session and redirects to /login", async ({ adminPage: page }) => {
    await page.goto("/");
    await expect(page.getByTestId("smoke-runner:top-nav:btn__logout")).toBeVisible();
    await Promise.all([
      page.waitForURL("/login"),
      page.getByTestId("smoke-runner:top-nav:btn__logout").click(),
    ]);
    // Session cookie gone: reloading a protected route bounces back to /login.
    await page.goto("/");
    await page.waitForURL("/login");
  });

  test("admin sees both admin nav links; qa_engineer sees neither", async ({ adminPage, qaEngineerPage }) => {
    await adminPage.goto("/");
    // The "Manage ..." links live inside a dropdown now — open it before checking visibility.
    await adminPage.getByTestId("smoke-runner:top-nav:btn__manage-menu").click();
    await expect(adminPage.getByTestId("smoke-runner:top-nav:link__admin-scenarios")).toBeVisible();
    await expect(adminPage.getByTestId("smoke-runner:top-nav:link__admin-users")).toBeVisible();

    await qaEngineerPage.goto("/");
    // qa_engineer has no Manage permissions at all — the menu button itself doesn't render.
    await expect(qaEngineerPage.getByTestId("smoke-runner:top-nav:btn__manage-menu")).toHaveCount(0);
    await expect(qaEngineerPage.getByTestId("smoke-runner:top-nav:link__admin-scenarios")).toHaveCount(0);
    await expect(qaEngineerPage.getByTestId("smoke-runner:top-nav:link__admin-users")).toHaveCount(0);
  });

  test("qa_lead sees the scenario admin link but not the user admin link", async ({ qaLeadPage: page }) => {
    await page.goto("/");
    await page.getByTestId("smoke-runner:top-nav:btn__manage-menu").click();
    await expect(page.getByTestId("smoke-runner:top-nav:link__admin-scenarios")).toBeVisible();
    await expect(page.getByTestId("smoke-runner:top-nav:link__admin-users")).toHaveCount(0);
  });
});
