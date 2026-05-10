import { expect, test } from "@playwright/test";
import { createTaskViaUI, signUpAndOpenTasks } from "./helpers/tasks-fixtures";

const TASK_DETAILS_DIALOG_REGEX = /Task details/i;
const STATUS_BACKLOG_BUTTON_NAME = "Status: Backlog. Click to change.";
const STATUS_IN_PROGRESS_BUTTON_NAME = "Status: In Progress. Click to change.";
const TASK_DETAIL_PATH_REGEX = /\/dashboard\/[^/]+\/tasks\/[a-z0-9]+/;

test.describe("Tasks detail", () => {
  test("clicking a row opens the peek sheet and inline status edit propagates", async ({
    page,
  }) => {
    await signUpAndOpenTasks(page, "tasks-detail-peek");

    await createTaskViaUI(page, { title: "Sketch detail peek flow" });

    const row = page
      .locator("[data-task-row]")
      .filter({
        has: page.getByRole("heading", {
          name: "Sketch detail peek flow",
          level: 3,
        }),
      })
      .first();

    // Click the title area to open the peek (avoids inline status button).
    await row
      .getByRole("heading", { name: "Sketch detail peek flow", level: 3 })
      .click();

    const sheet = page.getByRole("dialog", { name: TASK_DETAILS_DIALOG_REGEX });
    await expect(sheet).toBeVisible({ timeout: 10_000 });

    // Inline status popover inside the sheet — pick "In Progress".
    await sheet
      .getByRole("button", { name: STATUS_BACKLOG_BUTTON_NAME, exact: true })
      .first()
      .click();
    await page
      .getByRole("button", { name: "In Progress", exact: true })
      .first()
      .click();

    // Sheet's status badge should reflect the new value.
    await expect(
      sheet
        .getByRole("button", {
          name: STATUS_IN_PROGRESS_BUTTON_NAME,
          exact: true,
        })
        .first()
    ).toBeVisible({ timeout: 10_000 });

    // Close the sheet.
    await page.keyboard.press("Escape");
    await expect(sheet).not.toBeVisible({ timeout: 10_000 });

    // Row reflects the new status too.
    await expect(
      row.getByRole("button", {
        name: STATUS_IN_PROGRESS_BUTTON_NAME,
        exact: true,
      })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Cmd/Ctrl+click on a row opens the canonical full-page detail in a new tab", async ({
    context,
    page,
  }) => {
    await signUpAndOpenTasks(page, "tasks-detail-fullpage");

    await createTaskViaUI(page, { title: "Open me in new tab" });

    const heading = page.getByRole("heading", {
      name: "Open me in new tab",
      level: 3,
    });
    const row = page
      .locator("[data-task-row]")
      .filter({ has: heading })
      .first();

    const newPagePromise = context.waitForEvent("page", { timeout: 15_000 });
    // Use modifier-aware click. On macOS Meta opens a new tab, on Linux/Win Ctrl.
    await row.click({ modifiers: ["Meta"] });
    let newPage = await newPagePromise.catch(() => null);
    if (!newPage) {
      const fallbackPromise = context.waitForEvent("page", { timeout: 15_000 });
      await row.click({ modifiers: ["Control"] });
      newPage = await fallbackPromise;
    }

    await newPage.waitForLoadState("domcontentloaded", { timeout: 15_000 });
    await expect(newPage).toHaveURL(TASK_DETAIL_PATH_REGEX, {
      timeout: 15_000,
    });
    await expect(
      newPage.getByRole("heading", { name: "Open me in new tab" })
    ).toBeVisible({ timeout: 15_000 });
  });
});
