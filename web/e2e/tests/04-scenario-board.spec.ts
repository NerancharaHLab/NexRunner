import path from "path";
import { test, expect } from "../fixtures/auth";
import { E2E_SITE_KEY } from "../global-setup";
import { createRunViaUI, cleanId } from "../helpers/run";

const CRITICAL_ID = cleanId("E2E-SC-01");
const NORMAL_ID = cleanId("E2E-SC-02");
const OTHER_ID = cleanId("E2E-SC-03");
const EVIDENCE_FILE = path.resolve(__dirname, "../fixtures/files/test-evidence.png");

test.describe("Phase 4 - Scenario Board (status, notes, evidence, gate badge)", () => {
  test("failing a scenario flips the gate to NOT READY; passing all + critical flips it to READY", async ({
    adminPage: page,
  }) => {
    const runId = await createRunViaUI(page, E2E_SITE_KEY);
    const patchUrl = (scenarioId: string) =>
      `**/api/runs/${E2E_SITE_KEY}/${runId}/scenarios/${scenarioId}`;

    // The app PATCHes status and notes as two independent fire-and-forget
    // requests (see ScenarioBoard.tsx's setStatus/commitNotes) — both do a
    // read-current-then-upsert against the same ScenarioResult row, so
    // firing a second one before the first has landed is a real lost-update
    // race, not just a test-timing nicety. Wait for each to actually
    // complete before touching the same scenario again.
    await Promise.all([
      page.waitForResponse(patchUrl("E2E-SC-02")),
      page.getByTestId(`smoke-runner:scenario-item:btn-failed__${NORMAL_ID}`).click(),
    ]);
    const notesInput = page.getByTestId(`smoke-runner:scenario-item:input-notes__${NORMAL_ID}`);
    await notesInput.fill("BUG-123 broke this");
    await Promise.all([page.waitForResponse(patchUrl("E2E-SC-02")), notesInput.blur()]);

    await expect(page.getByTestId("smoke-runner:run-detail:badge__gate")).toContainText("NOT READY");
    await expect(page.locator(".stat-card.fail .num")).toHaveText("1");

    // Pass everything, including the critical scenario.
    await Promise.all([
      page.waitForResponse(patchUrl("E2E-SC-01")),
      page.getByTestId(`smoke-runner:scenario-item:btn-passed__${CRITICAL_ID}`).click(),
    ]);
    await Promise.all([
      page.waitForResponse(patchUrl("E2E-SC-02")),
      page.getByTestId(`smoke-runner:scenario-item:btn-passed__${NORMAL_ID}`).click(),
    ]);
    await Promise.all([
      page.waitForResponse(patchUrl("E2E-SC-03")),
      page.getByTestId(`smoke-runner:scenario-item:btn-passed__${OTHER_ID}`).click(),
    ]);

    await expect(page.getByTestId("smoke-runner:run-detail:badge__gate")).toContainText("READY");
    await expect(page.locator(".stat-card.pass .num")).toHaveText("3");

    // Reload to confirm the state actually persisted server-side, not just optimistic UI.
    // Note: the notes <input>'s value is an attribute, not a text node, so it
    // must be asserted with toHaveValue() — toContainText() on the card
    // would never see it regardless of whether the value is actually there.
    await page.goto(`/${E2E_SITE_KEY}/${runId}`);
    await expect(page.getByTestId("smoke-runner:run-detail:badge__gate")).toContainText("READY");
    await expect(page.getByTestId(`smoke-runner:scenario-item:input-notes__${NORMAL_ID}`)).toHaveValue(
      "BUG-123 broke this"
    );
  });

  test("evidence: upload shows a thumbnail, lightbox opens/closes, remove clears it", async ({ adminPage: page }) => {
    await createRunViaUI(page, E2E_SITE_KEY);

    const attachBtn = page.getByTestId(`smoke-runner:scenario-item:btn-attach-evidence__${CRITICAL_ID}`);
    const fileInput = page.getByTestId(`smoke-runner:scenario-item:input-evidence-file__${CRITICAL_ID}`);
    await expect(attachBtn).toBeVisible();
    await fileInput.setInputFiles(EVIDENCE_FILE);

    const thumb = page.locator(`[data-testid^="smoke-runner:scenario-item:evidence-thumb__${CRITICAL_ID}-"]`);
    await expect(thumb).toBeVisible();
    await expect(
      page.getByTestId(`smoke-runner:scenario-item:card__${CRITICAL_ID}`).locator(".section-label")
    ).toContainText("(1/6)");

    await thumb.click();
    const lightbox = page.getByTestId("smoke-runner:run-detail:modal__lightbox");
    await expect(lightbox).toBeVisible();
    await expect(page.getByTestId("smoke-runner:run-detail:img__lightbox")).toBeVisible();
    await page.getByTestId("smoke-runner:run-detail:btn__close-lightbox").click();
    await expect(lightbox).toBeHidden();

    const removeBtn = page.locator(`[data-testid^="smoke-runner:scenario-item:btn-remove-evidence__${CRITICAL_ID}-"]`);
    await removeBtn.click();
    await expect(thumb).toHaveCount(0);
    await expect(
      page.getByTestId(`smoke-runner:scenario-item:card__${CRITICAL_ID}`).locator(".section-label")
    ).toContainText("(0/6)");
  });
});
