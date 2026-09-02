import { test, expect } from "../fixtures/auth";
import { E2E_SITE_KEY, E2E_SITE_KEY_2, E2E_SITE_NAME } from "../global-setup";
import { stripNonAlnum } from "../helpers/run";

const GLOBAL_FILTER = "__global__";

async function createSuiteViaUI(
  page: import("@playwright/test").Page,
  name: string,
  siteId?: string,
  customScenarioCleanId?: string
) {
  await page.goto("/admin/suites/new");
  await page.getByTestId("smoke-runner:admin-suite-form:input__name").fill(name);
  if (siteId) {
    await page.getByTestId("smoke-runner:admin-suite-form:select__site").selectOption(siteId);
  }
  if (customScenarioCleanId) {
    await page.getByTestId(`smoke-runner:scenario-picker:chk__${customScenarioCleanId}`).check();
  }
  await Promise.all([
    page.waitForURL("/admin/suites"),
    page.getByTestId("smoke-runner:admin-suite-form:btn__save").click(),
  ]);
}

/** Reads a Suite's system-generated id back off its Edit page (the list page shows the Suite's
 *  name, not its id, as the headline — unlike the Scenario list which shows id directly). */
async function readSuiteIdViaEdit(page: import("@playwright/test").Page, name: string): Promise<string> {
  const row = page.locator('[data-testid^="smoke-runner:admin-suites:row__"]', { hasText: name });
  await Promise.all([
    page.waitForURL(/\/admin\/suites\/[^/]+\/edit$/),
    row.locator('[data-testid^="smoke-runner:admin-suites:btn-edit__"]').click(),
  ]);
  return ((await page.getByTestId("smoke-runner:admin-suite-form:input__id").textContent()) ?? "").trim();
}

async function deleteSuiteFromList(page: import("@playwright/test").Page, name: string) {
  const row = page.locator('[data-testid^="smoke-runner:admin-suites:row__"]', { hasText: name });
  await row.locator('[data-testid^="smoke-runner:admin-suites:btn-delete__"]').click();
  await page.getByTestId("smoke-runner:admin-suites:btn__confirm-delete").click();
  await expect(row).toHaveCount(0);
}

test.describe("Phase 10 - Suite Management Enhancements (REQ-039: site scoping, search, scenario picker)", () => {
  test("site-scoped Suite creation shows Master + Custom scope badges and lands on the list correctly", async ({
    adminPage: page,
  }) => {
    const scenarioName = `REQ039 Custom Scenario ${Date.now()}`;
    await page.goto(`/admin/scenarios/${E2E_SITE_KEY}/new`);
    await page.getByTestId("smoke-runner:admin-scenario-form:input__name").fill(scenarioName);
    await page.getByTestId("smoke-runner:admin-scenario-form:input__role").fill("QA");
    await page.getByTestId("smoke-runner:admin-scenario-form:textarea__steps").fill("1. Step one\n2. Step two");
    await page.getByTestId("smoke-runner:admin-scenario-form:textarea__criteria").fill("1. It works");
    await Promise.all([
      page.waitForURL(`/admin/scenarios/${E2E_SITE_KEY}`),
      page.getByTestId("smoke-runner:admin-scenario-form:btn__save").click(),
    ]);
    const scenarioRow = page.locator('[data-testid^="smoke-runner:admin-scenarios:row__"]', { hasText: scenarioName });
    const scenarioId = ((await scenarioRow.locator("strong").first().textContent()) ?? "").trim();
    expect(scenarioId).toMatch(new RegExp(`^${E2E_SITE_KEY}-CUST-\\d{4}$`));
    const cleanScenarioId = stripNonAlnum(scenarioId);

    const suiteName = `REQ039 Suite ${Date.now()}`;
    await page.goto("/admin/suites/new");
    await page.getByTestId("smoke-runner:admin-suite-form:input__name").fill(suiteName);
    await page.getByTestId("smoke-runner:admin-suite-form:select__site").selectOption(E2E_SITE_KEY);

    // Master scenarios are always offered regardless of Target Site; the freshly created Custom
    // Scenario should show up too, tagged with the correct "{SITE} Custom" scope badge — the whole
    // point of REQ-039 Decision #5.
    await expect(page.locator('[data-testid^="smoke-runner:scenario-picker:badge-scope__"]', { hasText: "Master" }).first()).toBeVisible();
    await expect(page.getByTestId(`smoke-runner:scenario-picker:badge-scope__${cleanScenarioId}`)).toHaveText(
      `${E2E_SITE_KEY} Custom`
    );

    await page.getByTestId(`smoke-runner:scenario-picker:chk__${cleanScenarioId}`).check();
    await Promise.all([
      page.waitForURL("/admin/suites"),
      page.getByTestId("smoke-runner:admin-suite-form:btn__save").click(),
    ]);

    const suiteRow = page.locator('[data-testid^="smoke-runner:admin-suites:row__"]', { hasText: suiteName });
    await expect(suiteRow).toBeVisible();
    await expect(suiteRow).toContainText("1 Scenario");
    await expect(suiteRow).toContainText(E2E_SITE_NAME);

    // Edit form pre-fills Target Site + the scenario checkbox correctly, then clean up from there
    // (its delete button submits directly, no confirm modal on the Edit page itself).
    await Promise.all([
      page.waitForURL(/\/admin\/suites\/[^/]+\/edit$/),
      suiteRow.locator('[data-testid^="smoke-runner:admin-suites:btn-edit__"]').click(),
    ]);
    await expect(page.getByTestId("smoke-runner:admin-suite-form:select__site")).toHaveValue(E2E_SITE_KEY);
    await expect(page.getByTestId(`smoke-runner:scenario-picker:chk__${cleanScenarioId}`)).toBeChecked();
    await Promise.all([
      page.waitForURL("/admin/suites"),
      page.getByTestId("smoke-runner:admin-suite-form:btn__delete").click(),
    ]);
    await expect(page.locator('[data-testid^="smoke-runner:admin-suites:row__"]', { hasText: suiteName })).toHaveCount(0);

    await page.goto(`/admin/scenarios/${E2E_SITE_KEY}`);
    await scenarioRow.locator('[data-testid^="smoke-runner:admin-scenarios:btn-delete__"]').click();
    await expect(scenarioRow).toHaveCount(0);
  });

  test("Manage Suites list: search narrows by name, and Filter-by-Site narrows correctly", async ({ adminPage: page }) => {
    const stamp = Date.now();
    const nameA = `REQ039SEARCH-A-${stamp}`; // scoped to E2E
    const nameB = `REQ039SEARCH-B-${stamp}`; // Global

    await createSuiteViaUI(page, nameA, E2E_SITE_KEY);
    await createSuiteViaUI(page, nameB);

    await page.goto("/admin/suites");
    const search = page.getByTestId("smoke-runner:admin-suites:input__search");
    await search.fill("REQ039SEARCH");
    await expect(page.locator('[data-testid^="smoke-runner:admin-suites:row__"]', { hasText: nameA })).toBeVisible();
    await expect(page.locator('[data-testid^="smoke-runner:admin-suites:row__"]', { hasText: nameB })).toBeVisible();

    await search.fill(nameA);
    await expect(page.locator('[data-testid^="smoke-runner:admin-suites:row__"]', { hasText: nameA })).toBeVisible();
    await expect(page.locator('[data-testid^="smoke-runner:admin-suites:row__"]', { hasText: nameB })).toHaveCount(0);
    await search.fill("");

    const siteFilter = page.getByTestId("smoke-runner:admin-suites:select__site-filter");
    await siteFilter.selectOption(E2E_SITE_KEY);
    await expect(page.locator('[data-testid^="smoke-runner:admin-suites:row__"]', { hasText: nameA })).toBeVisible();
    await expect(page.locator('[data-testid^="smoke-runner:admin-suites:row__"]', { hasText: nameB })).toHaveCount(0);

    await siteFilter.selectOption(GLOBAL_FILTER);
    await expect(page.locator('[data-testid^="smoke-runner:admin-suites:row__"]', { hasText: nameB })).toBeVisible();
    await expect(page.locator('[data-testid^="smoke-runner:admin-suites:row__"]', { hasText: nameA })).toHaveCount(0);

    await siteFilter.selectOption("");
    await deleteSuiteFromList(page, nameA);
    await deleteSuiteFromList(page, nameB);
  });

  test("delete-guard: plain confirm for an unused Suite, warning banner with the real count for an in-use one", async ({
    adminPage: page,
  }) => {
    // Plain path.
    const plainName = `REQ039 Unused Suite ${Date.now()}`;
    await createSuiteViaUI(page, plainName);
    const plainRow = page.locator('[data-testid^="smoke-runner:admin-suites:row__"]', { hasText: plainName });
    await plainRow.locator('[data-testid^="smoke-runner:admin-suites:btn-delete__"]').click();
    await expect(page.getByTestId("smoke-runner:admin-suites:modal__delete-confirm")).toBeVisible();
    await expect(page.getByTestId("smoke-runner:admin-suites:text__usage-warning")).toHaveCount(0);
    await page.getByTestId("smoke-runner:admin-suites:btn__confirm-delete").click();
    await expect(plainRow).toHaveCount(0);

    // In-use path: a real Custom Scenario + a Suite referencing it + a real Run filtered to it.
    const scenarioName = `REQ039 InUse Scenario ${Date.now()}`;
    await page.goto(`/admin/scenarios/${E2E_SITE_KEY}/new`);
    await page.getByTestId("smoke-runner:admin-scenario-form:input__name").fill(scenarioName);
    await page.getByTestId("smoke-runner:admin-scenario-form:input__role").fill("QA");
    await Promise.all([
      page.waitForURL(`/admin/scenarios/${E2E_SITE_KEY}`),
      page.getByTestId("smoke-runner:admin-scenario-form:btn__save").click(),
    ]);
    const scenarioRow = page.locator('[data-testid^="smoke-runner:admin-scenarios:row__"]', { hasText: scenarioName });
    const scenarioId = ((await scenarioRow.locator("strong").first().textContent()) ?? "").trim();
    const cleanScenarioId = stripNonAlnum(scenarioId);

    const inUseName = `REQ039 InUse Suite ${Date.now()}`;
    await createSuiteViaUI(page, inUseName, E2E_SITE_KEY, cleanScenarioId);
    const suiteId = await readSuiteIdViaEdit(page, inUseName);

    await page.goto(`/${E2E_SITE_KEY}/new`);
    await page.getByTestId("smoke-runner:new-run:btn__add-filter").click();
    await page.getByTestId("smoke-runner:new-run:filter-category__suite").click();
    await page.getByTestId(`smoke-runner:new-run:filter-option__suite__${suiteId}`).check();
    await Promise.all([
      page.waitForURL(new RegExp(`/${E2E_SITE_KEY}/RUN-${E2E_SITE_KEY}-\\d{4}$`)),
      page.getByTestId("smoke-runner:new-run:btn__start").click(),
    ]);

    await page.goto("/admin/suites");
    const inUseRow = page.locator('[data-testid^="smoke-runner:admin-suites:row__"]', { hasText: inUseName });
    await inUseRow.locator('[data-testid^="smoke-runner:admin-suites:btn-delete__"]').click();
    await expect(page.getByTestId("smoke-runner:admin-suites:text__usage-warning")).toContainText("1 existing Run");
    await page.getByTestId("smoke-runner:admin-suites:btn__confirm-delete").click();
    await expect(inUseRow).toHaveCount(0);

    // The Run itself is left in place (Runs have no delete feature — REQ-030/031's permanent audit
    // trail — same as every other e2e-created Run in this suite). Only the scratch Scenario is cleaned up.
    await page.goto(`/admin/scenarios/${E2E_SITE_KEY}`);
    await scenarioRow.locator('[data-testid^="smoke-runner:admin-scenarios:btn-delete__"]').click();
    await expect(scenarioRow).toHaveCount(0);
  });

  test("New Run's Suite picker only offers a Site's own Suites + Global ones (cross-site scoping)", async ({
    adminPage: page,
  }) => {
    const suiteName = `REQ039 CrossSite Suite ${Date.now()}`;
    await createSuiteViaUI(page, suiteName, E2E_SITE_KEY_2);
    const suiteId = await readSuiteIdViaEdit(page, suiteName);

    // Absent from E2E's own picker.
    await page.goto(`/${E2E_SITE_KEY}/new`);
    await page.getByTestId("smoke-runner:new-run:btn__add-filter").click();
    await page.getByTestId("smoke-runner:new-run:filter-category__suite").click();
    await expect(page.getByTestId(`smoke-runner:new-run:filter-option__suite__${suiteId}`)).toHaveCount(0);

    // Present on E2EB's own picker — the actual original business complaint this REQ exists to fix.
    await page.goto(`/${E2E_SITE_KEY_2}/new`);
    await page.getByTestId("smoke-runner:new-run:btn__add-filter").click();
    await page.getByTestId("smoke-runner:new-run:filter-category__suite").click();
    await expect(page.getByTestId(`smoke-runner:new-run:filter-option__suite__${suiteId}`)).toBeVisible();

    await page.goto(`/admin/suites/${encodeURIComponent(suiteId)}/edit`);
    await Promise.all([
      page.waitForURL("/admin/suites"),
      page.getByTestId("smoke-runner:admin-suite-form:btn__delete").click(),
    ]);
    await expect(page.locator('[data-testid^="smoke-runner:admin-suites:row__"]', { hasText: suiteName })).toHaveCount(0);
  });
});
