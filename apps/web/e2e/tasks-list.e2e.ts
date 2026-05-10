import { expect, test } from "@playwright/test";
import {
  createTaskViaUI,
  signUpAndOpenTasks,
  skipUnlessTasksE2E,
} from "./helpers/tasks-fixtures";

const PRIORITY_CHIP_REGEX = /^Priority(\s|$)/;
const PRIORITY_HIGH_URL_REGEX = /priority=high/;
const GROUP_BY_TRIGGER_TEXT_REGEX = /No grouping|Status|Priority|Assignee/;
const TODO_HEADING_REGEX = /TO DO/i;

test.describe("Tasks list", () => {
  test.beforeEach(() => {
    skipUnlessTasksE2E();
  });

  test("creates tasks, filters by priority, preserves URL state on reload", async ({
    page,
  }) => {
    await signUpAndOpenTasks(page, "tasks-list-priority");

    await createTaskViaUI(page, {
      title: "Investigate flaky deploy",
      priority: "high",
    });
    await createTaskViaUI(page, {
      title: "Polish onboarding tour",
      priority: "medium",
    });
    await createTaskViaUI(page, {
      title: "Audit security dashboards",
      priority: "low",
    });

    // Open the Priority chip and select "High".
    await page
      .getByRole("button", { name: PRIORITY_CHIP_REGEX })
      .first()
      .click();
    await page
      .getByRole("button", { name: "High", exact: true })
      .first()
      .click();
    // Close the popover so it doesn't intercept downstream clicks.
    await page.keyboard.press("Escape");

    await expect(page).toHaveURL(PRIORITY_HIGH_URL_REGEX, { timeout: 10_000 });

    await expect(
      page.getByRole("heading", { name: "Investigate flaky deploy", level: 3 })
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: "Polish onboarding tour", level: 3 })
    ).not.toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: "Audit security dashboards", level: 3 })
    ).not.toBeVisible({ timeout: 10_000 });

    // Reload preserves the filter via URL.
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(PRIORITY_HIGH_URL_REGEX, { timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: "Investigate flaky deploy", level: 3 })
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: "Polish onboarding tour", level: 3 })
    ).not.toBeVisible({ timeout: 10_000 });
  });

  test("search input narrows the list to matching titles", async ({ page }) => {
    await signUpAndOpenTasks(page, "tasks-list-search");

    await createTaskViaUI(page, { title: "Refactor billing pipeline" });
    await createTaskViaUI(page, { title: "Triage inbound feedback" });

    await page.getByLabel("Search tasks").fill("billing");

    await expect(
      page.getByRole("heading", { name: "Refactor billing pipeline", level: 3 })
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: "Triage inbound feedback", level: 3 })
    ).not.toBeVisible({ timeout: 10_000 });
  });

  test("group-by status renders status section headings", async ({ page }) => {
    await signUpAndOpenTasks(page, "tasks-list-groupby");

    await createTaskViaUI(page, { title: "Plan growth experiments" });
    await createTaskViaUI(page, { title: "Wire analytics dashboard" });

    // Open the Group by select trigger (combobox).
    await page
      .getByRole("combobox")
      .filter({ hasText: GROUP_BY_TRIGGER_TEXT_REGEX })
      .first()
      .click();
    await page.getByRole("option", { name: "Status", exact: true }).click();

    // After grouping by status the freshly-created tasks land under "TO DO".
    await expect(
      page.getByRole("button", { name: TODO_HEADING_REGEX }).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
