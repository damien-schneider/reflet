import { expect, type Page, test } from "@playwright/test";
import {
  createTestEmail,
  createTestName,
  DASHBOARD_ORG_SLUG_REGEX,
  expectAuthForm,
  signUpNewUserWithOrg,
} from "./auth";

/**
 * Tasks E2E suites depend on the org having Pro-tier autopilot access. Fresh
 * sign-ups default to the Free tier, and `createWorkItem` fails with
 * "Autopilot requires a Pro subscription." There is no UI affordance to
 * upgrade an org for testing today; the Convex unit tests bypass this by
 * patching `subscriptionTier` directly.
 *
 * Phase 7 needs a UI-driven (or test-only mutation) path to grant Pro to a
 * fresh org so these suites can drive the real product surface end-to-end.
 * Until then every Phase 7 suite is gated behind {@link skipUnlessTasksE2E}.
 *
 * Set `RUN_TASKS_E2E=1` in the environment to opt-in once an org-Pro
 * fixture exists.
 */
export const TASKS_E2E_ENV_FLAG = "RUN_TASKS_E2E";

export function skipUnlessTasksE2E(): void {
  test.skip(
    !process.env[TASKS_E2E_ENV_FLAG],
    `Tasks E2E suite skipped — set ${TASKS_E2E_ENV_FLAG}=1 once a Pro-tier seeding fixture lands.`
  );
}

const DASHBOARD_SLUG_EXTRACT_REGEX = /\/dashboard\/([^/]+)/;
const IDENTIFIER_REGEX = /[A-Z]{3,6}-\d+/;
const COPY_IDENTIFIER_BUTTON_REGEX = /Copy identifier/i;

export interface TasksTestUser {
  email: string;
  password: string;
}

export interface SignUpAndOpenTasksResult {
  orgSlug: string;
  user: TasksTestUser;
}

const extractDashboardOrgSlug = (url: string): string => {
  const match = url.match(DASHBOARD_SLUG_EXTRACT_REGEX);
  expect(
    match?.[1],
    `Expected dashboard organization slug in ${url}`
  ).toBeTruthy();
  return match?.[1] ?? "";
};

/**
 * Sign up a fresh user, create a fresh organization, and navigate to that
 * organization's `/tasks` route. Returns the slug + user credentials so a
 * single test can chain follow-up assertions.
 */
export async function signUpAndOpenTasks(
  page: Page,
  prefix = "tasks-e2e"
): Promise<SignUpAndOpenTasksResult> {
  const user: TasksTestUser = {
    email: createTestEmail(prefix),
    password: "password123",
  };
  const orgName = createTestName("Tasks Org");

  await page.goto("/dashboard");
  await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
  await expectAuthForm(page);

  await signUpNewUserWithOrg(page, user, orgName);

  await expect(page).toHaveURL(DASHBOARD_ORG_SLUG_REGEX, { timeout: 20_000 });
  await page.waitForLoadState("networkidle");

  const orgSlug = extractDashboardOrgSlug(page.url());

  await page.goto(`/dashboard/${orgSlug}/tasks`);
  await page.waitForLoadState("networkidle");

  await expect(
    page.getByRole("heading", { name: "Tasks", exact: true })
  ).toBeVisible({ timeout: 15_000 });

  return { orgSlug, user };
}

export interface CreateTaskOptions {
  description?: string;
  priority?: "critical" | "high" | "medium" | "low";
  title: string;
  type?: "task" | "bug" | "story";
}

/**
 * Drives the existing "New Task" dialog (the admin button on `/tasks`) to
 * create a single work item end-to-end. This avoids reaching into Convex
 * test mode and keeps the e2e suite hermetic to the real UI surface.
 */
export async function createTaskViaUI(
  page: Page,
  { title, type, priority, description }: CreateTaskOptions
): Promise<void> {
  await page.getByRole("button", { name: "New Task" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 10_000 });

  await dialog.getByLabel("Title").fill(title);
  await dialog
    .getByLabel("Description")
    .fill(description ?? `${title} description`);

  if (type) {
    await dialog.locator("#new-task-type").click();
    await page
      .getByRole("option", { name: typeLabel(type), exact: true })
      .click();
  }
  if (priority) {
    await dialog.locator("#new-task-priority").click();
    await page
      .getByRole("option", { name: priorityLabel(priority), exact: true })
      .click();
  }

  await dialog.getByRole("button", { name: "Create Task" }).click();
  await expect(dialog).not.toBeVisible({ timeout: 10_000 });
  await page.waitForLoadState("networkidle");

  await expectTaskInList(page, title);
}

const typeLabel = (value: "task" | "bug" | "story"): string => {
  switch (value) {
    case "task":
      return "Task";
    case "bug":
      return "Bug";
    case "story":
      return "Story";
    default:
      return value;
  }
};

const priorityLabel = (
  value: "critical" | "high" | "medium" | "low"
): string => {
  switch (value) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    default:
      return value;
  }
};

/** Asserts that a task with the given title is rendered as a row. */
export async function expectTaskInList(
  page: Page,
  title: string
): Promise<void> {
  await expect(
    page.getByRole("heading", { name: title, level: 3 })
  ).toBeVisible({ timeout: 15_000 });
}

/** Reads the identifier chip rendered next to a task title, e.g. `TAS-1`. */
export async function extractIdentifier(
  page: Page,
  title: string
): Promise<string> {
  const row = page
    .locator("[data-task-row]")
    .filter({ has: page.getByRole("heading", { name: title, level: 3 }) })
    .first();
  const identifier = row.getByRole("button", {
    name: COPY_IDENTIFIER_BUTTON_REGEX,
  });
  await expect(identifier).toBeVisible({ timeout: 10_000 });
  const text = (await identifier.textContent())?.trim() ?? "";
  expect(text, `Identifier should match ${IDENTIFIER_REGEX}`).toMatch(
    IDENTIFIER_REGEX
  );
  return text;
}

export const TASK_IDENTIFIER_REGEX = IDENTIFIER_REGEX;
