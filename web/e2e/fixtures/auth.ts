import { test as base, expect, type Page } from "@playwright/test";
import { E2E_USERS } from "../global-setup";

/**
 * Real cookie-based login (not a sessionStorage/localStorage shortcut) — the
 * app's session is an httpOnly cookie set by the loginAction Server Action
 * (web/app/login/page.tsx), so there's no client-side shortcut available
 * anyway. Each fixture performs an actual UI login against the corresponding
 * global-setup.ts fixture user and hands back the authenticated page.
 */
async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByTestId("smoke-runner:login:input__email").fill(email);
  await page.getByTestId("smoke-runner:login:input__password").fill(password);
  await Promise.all([
    page.waitForURL("/"),
    page.getByTestId("smoke-runner:login:btn__submit").click(),
  ]);
}

interface Fixtures {
  adminPage: Page;
  qaLeadPage: Page;
  qaEngineerPage: Page;
}

// Each fixture gets its OWN browser context (and therefore its own cookie
// jar), not the shared default `page` fixture — a test that requests two of
// these together (e.g. adminPage + qaEngineerPage, to compare what each role
// sees) must not have the second login overwrite the first one's session.
export const test = base.extend<Fixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, E2E_USERS.admin.email, E2E_USERS.admin.password);
    await use(page);
    await context.close();
  },
  qaLeadPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, E2E_USERS.qaLead.email, E2E_USERS.qaLead.password);
    await use(page);
    await context.close();
  },
  qaEngineerPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, E2E_USERS.qaEngineer.email, E2E_USERS.qaEngineer.password);
    await use(page);
    await context.close();
  },
});

export { expect };
