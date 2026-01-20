import { expect, test } from "@playwright/test";

// Auth form headings (French UI)
const AUTH_SIGNUP_HEADING = "Créer un compte";

const DASHBOARD_URL_PATTERN = /\/dashboard\/[^/]+$/;
const BOARDS_URL_PATTERN = /\/dashboard\/[^/]+\/boards$/;
const SETTINGS_URL_PATTERN = /\/dashboard\/[^/]+\/settings$/;
const BOARDS_LINK_REGEX = /Boards/i;
const SETTINGS_LINK_REGEX = /Settings/i;

/**
 * Helper to complete sign-up flow with the new unified auth form
 */
async function signUpNewUser(
  page: import("@playwright/test").Page,
  user: { name: string; email: string; password: string }
) {
  await page.getByTestId("email-input").fill(user.email);
  await page.getByTestId("email-input").blur();

  await expect(page.locator("h1")).toContainText(AUTH_SIGNUP_HEADING, {
    timeout: 10_000,
  });

  await page.getByTestId("name-input").fill(user.name);
  await page.getByTestId("password-input").fill(user.password);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
}

test.describe("Sidebar Navigation - Boards and Settings", () => {
  test("should navigate to Boards page without 404 error", async ({ page }) => {
    const timestamp = Date.now();
    const testUser = {
      name: `NavTest ${timestamp}`,
      email: `nav-test-${timestamp}@example.com`,
      password: "password123",
    };

    // Track 404 responses
    const responses404: string[] = [];
    page.on("response", (response) => {
      if (response.status() === 404) {
        responses404.push(response.url());
      }
    });

    // 1. Sign up to get to the dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

    await signUpNewUser(page, testUser);

    // Wait for the dashboard to load
    await page.waitForURL(DASHBOARD_URL_PATTERN, { timeout: 20_000 });
    await page.waitForLoadState("networkidle");

    // 2. Click on "Boards" in sidebar
    const boardsLink = page.getByRole("link", { name: BOARDS_LINK_REGEX });
    await expect(boardsLink).toBeVisible({ timeout: 10_000 });
    await boardsLink.click();

    // 3. Verify URL and no 404
    await expect(page).toHaveURL(BOARDS_URL_PATTERN, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    // Check no 404 HTTP responses for the boards page
    const boards404 = responses404.filter((url) => url.includes("/boards"));
    expect(boards404.length).toBe(0);

    // Verify page content - should show Boards heading (h1 specifically)
    await expect(
      page.getByRole("heading", { name: "Boards", exact: true, level: 1 })
    ).toBeVisible({
      timeout: 10_000,
    });
  });

  test("should navigate to Settings page without 404 error", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testUser = {
      name: `NavTest ${timestamp}`,
      email: `nav-test-settings-${timestamp}@example.com`,
      password: "password123",
    };

    // Track 404 responses
    const responses404: string[] = [];
    page.on("response", (response) => {
      if (response.status() === 404) {
        responses404.push(response.url());
      }
    });

    // 1. Sign up to get to the dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

    await signUpNewUser(page, testUser);

    // Wait for the dashboard to load
    await page.waitForURL(DASHBOARD_URL_PATTERN, { timeout: 20_000 });
    await page.waitForLoadState("networkidle");

    // 2. Click on "Settings" in sidebar
    const settingsLink = page.getByRole("link", { name: SETTINGS_LINK_REGEX });
    await expect(settingsLink).toBeVisible({ timeout: 10_000 });
    await settingsLink.click();

    // 3. Verify URL and no 404
    await expect(page).toHaveURL(SETTINGS_URL_PATTERN, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    // Check no 404 HTTP responses for the settings page
    const settings404 = responses404.filter((url) => url.includes("/settings"));
    expect(settings404.length).toBe(0);

    // Verify page content - should show Settings heading
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({
      timeout: 10_000,
    });
  });
});
