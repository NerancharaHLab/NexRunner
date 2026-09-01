import { test, expect } from "../fixtures/auth";
import { hashPassword } from "../../lib/auth/password";
import { createUser, deleteUser } from "../../lib/db/users-table";

test.describe("Phase 9 - Self-service change password", () => {
  test("change password via the UI, then old password fails and new one works", async ({ browser }) => {
    const email = `e2e-pw-user-${Date.now()}@test.com`;
    const oldPassword = "OldPassw0rd!";
    const newPassword = "NewPassw0rd!";

    const passwordHash = await hashPassword(oldPassword);
    await createUser({ email, passwordHash, displayName: "Password Test User", roles: ["qa_engineer"] });

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/login");
    await page.getByTestId("smoke-runner:login:input__email").fill(email);
    await page.getByTestId("smoke-runner:login:input__password").fill(oldPassword);
    await Promise.all([
      page.waitForURL("/"),
      page.getByTestId("smoke-runner:login:btn__submit").click(),
    ]);

    await page.goto("/change-password");
    await page.getByTestId("smoke-runner:change-password:input__current").fill(oldPassword);
    await page.getByTestId("smoke-runner:change-password:input__next").fill(newPassword);
    await page.getByTestId("smoke-runner:change-password:input__confirm").fill(newPassword);
    await Promise.all([
      page.waitForURL(/ok=1/),
      page.getByTestId("smoke-runner:change-password:btn__submit").click(),
    ]);

    // Log out, then confirm old password no longer works and new one does.
    await Promise.all([
      page.waitForURL("/login"),
      page.getByTestId("smoke-runner:top-nav:btn__logout").click(),
    ]);

    await page.getByTestId("smoke-runner:login:input__email").fill(email);
    await page.getByTestId("smoke-runner:login:input__password").fill(oldPassword);
    await page.getByTestId("smoke-runner:login:btn__submit").click();
    await page.waitForURL(/error=/);
    await expect(page.locator(".error-banner")).toBeVisible();

    await page.goto("/login");
    await page.getByTestId("smoke-runner:login:input__email").fill(email);
    await page.getByTestId("smoke-runner:login:input__password").fill(newPassword);
    await Promise.all([
      page.waitForURL("/"),
      page.getByTestId("smoke-runner:login:btn__submit").click(),
    ]);
    await expect(page.locator("h1")).toContainText("Smoke Test Runner");

    await context.close();
    await deleteUser(email);
  });

  test("wrong current password is rejected", async ({ adminPage: page }) => {
    await page.goto("/change-password");
    await page.getByTestId("smoke-runner:change-password:input__current").fill("definitely-wrong");
    await page.getByTestId("smoke-runner:change-password:input__next").fill("SomeNewPassw0rd!");
    await page.getByTestId("smoke-runner:change-password:input__confirm").fill("SomeNewPassw0rd!");
    await page.getByTestId("smoke-runner:change-password:btn__submit").click();
    await page.waitForURL(/error=/);
    await expect(page.locator(".error-banner")).toBeVisible();
  });
});
