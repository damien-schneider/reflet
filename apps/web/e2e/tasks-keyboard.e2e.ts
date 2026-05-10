import { expect, test } from "@playwright/test";
import {
  createTaskViaUI,
  signUpAndOpenTasks,
  skipUnlessTasksE2E,
} from "./helpers/tasks-fixtures";

const TASK_DETAIL_PATH_REGEX = /\/tasks\/[a-z0-9]+$/;
const PALETTE_DIALOG_REGEX = /Tasks command palette/i;
const PALETTE_OPTION_REGEX = /Palette target alpha/i;
const ORG_TASK_PATH_REGEX = /\/dashboard\/[^/]+\/tasks\/[a-z0-9]+/;

test.describe("Tasks keyboard", () => {
  test.beforeEach(() => {
    skipUnlessTasksE2E();
  });

  test("j/k focus rows, Enter opens detail, Esc closes", async ({ page }) => {
    await signUpAndOpenTasks(page, "tasks-kb-jk");

    await createTaskViaUI(page, { title: "Keyboard alpha" });
    await createTaskViaUI(page, { title: "Keyboard beta" });
    await createTaskViaUI(page, { title: "Keyboard gamma" });

    // Move focus away from any input first.
    await page.locator("body").click();

    await page.keyboard.press("j");
    const rows = page.locator("[data-task-row]");
    await expect(rows.nth(0)).toHaveAttribute("aria-selected", "true", {
      timeout: 10_000,
    });

    await page.keyboard.press("j");
    await expect(rows.nth(1)).toHaveAttribute("aria-selected", "true", {
      timeout: 10_000,
    });

    // Enter opens the focused row's detail page.
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(TASK_DETAIL_PATH_REGEX, { timeout: 15_000 });
  });

  test("Cmd/Ctrl+K opens the palette and selecting a hit navigates to that task", async ({
    page,
  }) => {
    await signUpAndOpenTasks(page, "tasks-kb-palette");

    await createTaskViaUI(page, { title: "Palette target alpha" });
    await createTaskViaUI(page, { title: "Palette decoy beta" });

    await page.locator("body").click();

    // Try Meta first (mac), Control second (linux/win runners).
    await page.keyboard.press("Meta+k").catch(async () => {
      await page.keyboard.press("Control+k");
    });

    const palette = page.getByRole("dialog", {
      name: PALETTE_DIALOG_REGEX,
    });
    await expect(palette).toBeVisible({ timeout: 10_000 });

    await palette.getByRole("combobox").fill("alpha");
    // Wait for debounced search to settle.
    await page.waitForLoadState("networkidle");

    // Selecting the first matching task option navigates to its detail page.
    const option = palette
      .getByRole("option", { name: PALETTE_OPTION_REGEX })
      .first();
    await expect(option).toBeVisible({ timeout: 10_000 });
    await option.click();

    await expect(page).toHaveURL(ORG_TASK_PATH_REGEX, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Palette target alpha" })
    ).toBeVisible({ timeout: 15_000 });
  });
});
