import { expect, type Page } from "@playwright/test";
import {
  createTestEmail,
  createTestName,
  DASHBOARD_ORG_SLUG_REGEX,
  expectAuthForm,
  signUpNewUserWithOrg,
} from "./auth";

/**
 * Tasks E2E suites need the org to have Pro-tier autopilot access — fresh
 * sign-ups default to Free, and `createWorkItem` would otherwise fail with
 * "Autopilot requires a Pro subscription." Unit tests bypass this by
 * patching `subscriptionTier` directly; the E2E flow can't reach Convex
 * internals.
 *
 * The bypass is now an env-gated short-circuit inside `getEffectiveTier`
 * (see `packages/backend/convex/billing/effective_tier.ts`). When
 * `AUTOPILOT_E2E_BYPASS=1` is set on the Convex deployment, every org is
 * reported as Pro. The `playwright.config.ts` forwards the var to the Next
 * dev server, but Convex queries/mutations execute on the Convex
 * deployment, so the deployment itself must also have the var set.
 *
 * One-liner for local dev (run before `bun run test:e2e`):
 *
 *   cd packages/backend && bunx convex env set AUTOPILOT_E2E_BYPASS 1
 *
 * To clean up afterwards:
 *
 *   cd packages/backend && bunx convex env remove AUTOPILOT_E2E_BYPASS
 *
 * The bypass MUST NEVER be set on production deployments — it grants Pro to
 * every org. `getEffectiveTier` emits a `console.warn` whenever it takes
 * effect so misconfiguration is loud in deployment logs.
 */

const DASHBOARD_SLUG_EXTRACT_REGEX = /\/dashboard\/([^/]+)/;
const IDENTIFIER_REGEX = /[A-Z]{3,6}-\d+/;
const PRIORITY_BUTTON_NAME_REGEX = /Priority:/;
const TYPE_BUTTON_NAME_REGEX = /Type:/;

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

  // Pre-set cookie consent before any page renders. The cookie consent banner
  // sits at z-50 and intercepts pointer events on the bulk action toolbar
  // (z-40), causing flaky clicks when the banner is visible.
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("cookie-consent", "rejected");
    } catch {
      /* localStorage may be unavailable in some contexts */
    }
  });

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

  await dialog.getByLabel("Issue title").fill(title);
  await dialog
    .getByLabel("Issue description")
    .fill(description ?? `${title} description`);

  if (type) {
    await dialog.getByRole("button", { name: TYPE_BUTTON_NAME_REGEX }).click();
    await page
      .getByRole("button", { exact: true, name: typeLabel(type) })
      .click();
  }
  if (priority) {
    await dialog
      .getByRole("button", { name: PRIORITY_BUTTON_NAME_REGEX })
      .click();
    await page
      .getByRole("button", { exact: true, name: priorityLabel(priority) })
      .click();
  }

  await dialog.getByRole("button", { name: "Create issue" }).click();
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
  // The TaskCard wrapper is itself role="button" with an aria-label that
  // includes "Copy identifier ...", so loose matching catches the wrapper too.
  // Target the actual chip via its inner mono-font text content.
  const identifier = row
    .locator('button[aria-label^="Copy identifier "]')
    .first();
  await expect(identifier).toBeVisible({ timeout: 10_000 });
  const text = (await identifier.textContent())?.trim() ?? "";
  expect(text, `Identifier should match ${IDENTIFIER_REGEX}`).toMatch(
    IDENTIFIER_REGEX
  );
  return text;
}

export const TASK_IDENTIFIER_REGEX = IDENTIFIER_REGEX;
