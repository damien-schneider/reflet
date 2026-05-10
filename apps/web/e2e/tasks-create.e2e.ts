import { expect, test } from "@playwright/test";
import {
  createTaskViaUI,
  expectTaskInList,
  extractIdentifier,
  signUpAndOpenTasks,
  skipUnlessTasksE2E,
  TASK_IDENTIFIER_REGEX,
} from "./helpers/tasks-fixtures";

const QUICK_CREATE_DIALOG_REGEX = /Quick create task/i;
const PRIORITY_HIGH_BADGE_REGEX = /Priority: High/;

test.describe("Tasks create", () => {
  test.beforeEach(() => {
    skipUnlessTasksE2E();
  });

  test("press 'c' opens quick-create dialog and Enter submits, identifier appears", async ({
    page,
  }) => {
    await signUpAndOpenTasks(page, "tasks-create-quick");

    // Make sure the keyboard hotkey doesn't collide with an input element.
    await page.locator("body").click();
    await page.keyboard.press("c");

    const dialog = page.getByRole("dialog", {
      name: QUICK_CREATE_DIALOG_REGEX,
    });
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    const titleInput = dialog.getByLabel("Task title");
    await titleInput.fill("Quick draft via hotkey");
    await titleInput.press("Meta+Enter").catch(async () => {
      await titleInput.press("Control+Enter");
    });

    await expect(dialog).not.toBeVisible({ timeout: 10_000 });
    await page.waitForLoadState("networkidle");

    await expectTaskInList(page, "Quick draft via hotkey");
    const identifier = await extractIdentifier(page, "Quick draft via hotkey");
    expect(identifier).toMatch(TASK_IDENTIFIER_REGEX);
  });

  test("New Task dialog creates a task with description and priority", async ({
    page,
  }) => {
    await signUpAndOpenTasks(page, "tasks-create-dialog");

    await createTaskViaUI(page, {
      title: "Refresh marketing copy",
      description: "Bring landing page in line with the Q3 messaging.",
      priority: "high",
    });

    // Tasks list should now render the row with the chosen priority chip.
    const row = page
      .locator("[data-task-row]")
      .filter({
        has: page.getByRole("heading", {
          name: "Refresh marketing copy",
          level: 3,
        }),
      })
      .first();
    await expect(
      row.getByRole("button", { name: PRIORITY_HIGH_BADGE_REGEX })
    ).toBeVisible({ timeout: 10_000 });
  });
});
