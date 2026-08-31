import { test, expect } from "../fixtures/auth";

async function loginAsNewContext(browser: import("@playwright/test").Browser, email: string, password: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByTestId("smoke-runner:login:input__email").fill(email);
  await page.getByTestId("smoke-runner:login:input__password").fill(password);
  await Promise.all([
    page.waitForURL("/"),
    page.getByTestId("smoke-runner:login:btn__submit").click(),
  ]);
  return { context, page };
}

test.describe("Phase 8 - Admin User CRUD, multi-role, deactivate, admin-only boundary", () => {
  test("admin creates a user, assigns a 2nd role, deactivates (immediate), reactivates, then deletes", async ({
    adminPage: page,
    browser,
  }) => {
    const email = `e2e-crud-user-${Date.now()}@test.com`;
    const password = "Passw0rd!";

    // ---- create (default checkbox pre-selects qa_engineer only) ----
    await page.goto("/admin/users");
    await page.getByTestId("smoke-runner:admin-users:input__display-name").fill("CRUD Test User");
    await page.getByTestId("smoke-runner:admin-users:input__email").fill(email);
    await page.getByTestId("smoke-runner:admin-users:input__password").fill(password);
    await Promise.all([
      page.waitForURL("/admin/users"),
      page.getByTestId("smoke-runner:admin-users:btn__create").click(),
    ]);

    const row = page.getByTestId(`smoke-runner:admin-users:row__${email}`);
    await expect(row).toBeVisible();
    await expect(row).toContainText("qa_engineer");

    // qa_engineer alone can't reach /admin/scenarios yet.
    const first = await loginAsNewContext(browser, email, password);
    await first.page.goto("/admin/scenarios");
    await first.page.waitForURL("/");
    await first.context.close();

    // ---- assign a 2nd role (qa_lead) via the row's checkbox set ----
    await page.goto("/admin/users");
    await page.getByTestId(`smoke-runner:admin-users:chk-role-row__${email}__qa_lead`).check();
    await Promise.all([
      page.waitForURL("/admin/users"),
      page.getByTestId(`smoke-runner:admin-users:btn-update-role__${email}`).click(),
    ]);
    await expect(page.getByTestId(`smoke-runner:admin-users:row__${email}`)).toContainText("qa_lead");

    // Now qa_engineer + qa_lead can reach /admin/scenarios (permission boundary actually changed).
    const second = await loginAsNewContext(browser, email, password);
    await second.page.goto("/admin/scenarios");
    await expect(second.page.locator("h1")).toContainText("จัดการ Scenario");

    // ---- deactivate while `second` is still logged in — must take effect immediately ----
    await page.goto("/admin/users");
    await Promise.all([
      page.waitForURL("/admin/users"),
      page.getByTestId(`smoke-runner:admin-users:btn-toggle-active__${email}`).click(),
    ]);
    await expect(page.getByTestId(`smoke-runner:admin-users:badge-inactive__${email}`)).toBeVisible();

    await second.page.goto("/"); // same already-authenticated context, no new login
    await second.page.waitForURL("/login");
    await second.context.close();

    // ---- reactivate restores access ----
    await page.goto("/admin/users");
    await Promise.all([
      page.waitForURL("/admin/users"),
      page.getByTestId(`smoke-runner:admin-users:btn-toggle-active__${email}`).click(),
    ]);
    await expect(page.getByTestId(`smoke-runner:admin-users:badge-inactive__${email}`)).toHaveCount(0);

    const third = await loginAsNewContext(browser, email, password);
    await expect(third.page.locator("h1")).toContainText("Smoke Test Runner");
    await third.context.close();

    // ---- delete ----
    await page.goto("/admin/users");
    await page.getByTestId(`smoke-runner:admin-users:btn-delete__${email}`).click();
    await expect(page.getByTestId(`smoke-runner:admin-users:row__${email}`)).toHaveCount(0);
  });

  test("qa_lead is redirected away from /admin/users (stricter admin-only boundary)", async ({ qaLeadPage: page }) => {
    await page.goto("/admin/users");
    await page.waitForURL("/");
  });
});
