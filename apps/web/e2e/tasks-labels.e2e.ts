import { expect, test } from "@playwright/test";
import { createTaskViaUI, signUpAndOpenTasks } from "./helpers/tasks-fixtures";

const CREATE_LABEL_DIALOG_REGEX = /Create label/i;
const RED_COLOR_BUTTON_REGEX = /Red/i;
const LABELS_FILTER_CHIP_REGEX = /^Labels(\s|$)/;
const LABEL_IDS_URL_REGEX = /labelIds=/;

test.describe("Tasks labels", () => {
  test("admin creates a label, assigns it to a task, then filters by it", async ({
    page,
  }) => {
    const { orgSlug } = await signUpAndOpenTasks(page, "tasks-labels");

    await createTaskViaUI(page, { title: "Label me later" });

    // Create the label via the admin page.
    await page.goto(`/dashboard/${orgSlug}/labels`);
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", { name: "Labels", exact: true })
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "New label" }).click();

    const dialog = page.getByRole("dialog", {
      name: CREATE_LABEL_DIALOG_REGEX,
    });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await dialog.getByLabel("Name").fill("bug-x");
    // Pick a non-default color so the swatch click is meaningful (still passes
    // if the default is applied).
    await dialog
      .getByRole("button", { name: RED_COLOR_BUTTON_REGEX })
      .first()
      .click()
      .catch(() => undefined);
    await dialog.getByRole("button", { name: "Create label" }).click();
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    // Confirm the label row exists.
    await expect(page.getByText("bug-x", { exact: true })).toBeVisible({
      timeout: 10_000,
    });

    // Back to /tasks and assign the label inline.
    await page.goto(`/dashboard/${orgSlug}/tasks`);
    await page.waitForLoadState("networkidle");

    const row = page
      .locator("[data-task-row]")
      .filter({
        has: page.getByRole("heading", { name: "Label me later", level: 3 }),
      })
      .first();

    await row
      .getByRole("button", { name: "Manage labels", exact: true })
      .click();
    const popover = page
      .getByRole("button", { name: "bug-x", exact: false })
      .first();
    await expect(popover).toBeVisible({ timeout: 10_000 });
    await popover.click();
    // Dismiss the popover by pressing Escape so the row click chain is clean.
    await page.keyboard.press("Escape");

    // Filter by the label and assert URL contains labelIds.
    await page
      .getByRole("button", { name: LABELS_FILTER_CHIP_REGEX })
      .first()
      .click();
    await page
      .getByRole("button", { name: "bug-x", exact: true })
      .first()
      .click();
    await page.keyboard.press("Escape");

    await expect(page).toHaveURL(LABEL_IDS_URL_REGEX, { timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: "Label me later", level: 3 })
    ).toBeVisible({ timeout: 10_000 });
  });
});
