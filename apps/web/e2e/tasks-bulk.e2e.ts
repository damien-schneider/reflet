import { expect, test } from "@playwright/test";
import { createTaskViaUI, signUpAndOpenTasks } from "./helpers/tasks-fixtures";

const SELECT_TOGGLE_BUTTON_REGEX = /Select task|Deselect task/;
const PRIORITY_BUTTON_NAME = "Priority";
const PRIORITY_HIGH_TOAST_REGEX = /Updated priority to High/i;
const PRIORITY_HIGH_BADGE_NAME = "Priority: High. Click to change.";

test.describe("Tasks bulk actions", () => {
  test("shift-click selects a range, bulk priority change updates every row", async ({
    page,
  }) => {
    await signUpAndOpenTasks(page, "tasks-bulk");

    await createTaskViaUI(page, { title: "Bulk row alpha" });
    await createTaskViaUI(page, { title: "Bulk row beta" });
    await createTaskViaUI(page, { title: "Bulk row gamma" });

    const rows = page.locator("[data-task-row]");
    await expect(rows).toHaveCount(3, { timeout: 15_000 });

    // Hover row 0 to surface the checkbox and click it.
    await rows.nth(0).hover();
    await rows
      .nth(0)
      .getByRole("button", { name: SELECT_TOGGLE_BUTTON_REGEX })
      .click();

    // Shift-click row 2 to select the whole range.
    await rows.nth(2).hover();
    await rows
      .nth(2)
      .getByRole("button", { name: SELECT_TOGGLE_BUTTON_REGEX })
      .click({ modifiers: ["Shift"] });

    const bar = page.getByRole("toolbar", { name: "Bulk actions" });
    await expect(bar).toBeVisible({ timeout: 10_000 });
    await expect(bar.getByText("3 selected")).toBeVisible({ timeout: 10_000 });

    await bar
      .getByRole("button", { name: PRIORITY_BUTTON_NAME, exact: true })
      .click();
    await page
      .getByRole("menuitem", { name: "High", exact: true })
      .first()
      .click();

    // Toast confirmation appears.
    await expect(page.getByText(PRIORITY_HIGH_TOAST_REGEX).first()).toBeVisible(
      { timeout: 10_000 }
    );

    // Wait for selection to clear (bar dismisses on success).
    await expect(bar).not.toBeVisible({ timeout: 15_000 });

    // Each row now has the High priority chip.
    for (const title of ["Bulk row alpha", "Bulk row beta", "Bulk row gamma"]) {
      const row = page
        .locator("[data-task-row]")
        .filter({
          has: page.getByRole("heading", { name: title, level: 3 }),
        })
        .first();
      await expect(
        row.getByRole("button", {
          name: PRIORITY_HIGH_BADGE_NAME,
          exact: true,
        })
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("clears selection without mutating any task", async ({ page }) => {
    await signUpAndOpenTasks(page, "tasks-bulk-clear");

    await createTaskViaUI(page, { title: "Clear bulk delta" });
    await createTaskViaUI(page, { title: "Clear bulk epsilon" });
    await createTaskViaUI(page, { title: "Clear bulk zeta" });

    const rows = page.locator("[data-task-row]");
    await expect(rows).toHaveCount(3, { timeout: 15_000 });

    await rows.nth(0).hover();
    const selectBtn = rows
      .nth(0)
      .getByRole("button", { name: SELECT_TOGGLE_BUTTON_REGEX });
    await selectBtn.evaluate((el) => (el as HTMLButtonElement).click());

    const bar = page.getByRole("toolbar", { name: "Bulk actions" });
    await expect(bar).toBeVisible({ timeout: 10_000 });

    await page.keyboard.press("Escape");
    await expect(bar).not.toBeVisible({ timeout: 10_000 });
  });
});
