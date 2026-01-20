import { expect, test } from "@playwright/test";

// Auth form headings (French UI)
const AUTH_SIGNUP_HEADING = "Créer un compte";

// URL patterns - all top-level
const DASHBOARD_URL_PATTERN = /\/dashboard\/[^/]+$/;
const BOARD_DETAIL_URL_PATTERN = /\/dashboard\/[^/]+\/boards\/[^/]+$/;
const ORG_SLUG_PATTERN = /\/dashboard\/([^/]+)$/;
const TEST_BOARD_NAME_PATTERN = /Test Board/i;

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

/**
 * Helper to create a board using the header button
 */
async function createBoard(
  page: import("@playwright/test").Page,
  name: string
) {
  // Click the header Create Board button (not the empty state one)
  const createButton = page
    .locator('[data-slot="dialog-trigger"]')
    .filter({ hasText: "Create Board" })
    .first();
  await createButton.click();

  // Wait for dialog to appear
  await expect(page.getByLabel("Board name")).toBeVisible({ timeout: 5000 });
  await page.getByLabel("Board name").fill(name);

  // Click the dialog's Create button (inside the dialog footer)
  await page
    .locator('[role="dialog"]')
    .getByRole("button", { name: "Create" })
    .click();

  // Wait for dialog to close and board to appear
  await expect(page.getByLabel("Board name")).not.toBeVisible({
    timeout: 10_000,
  });
}

test.describe("Full Navigation E2E - No 404 Errors", () => {
  test("should navigate through all dashboard pages without 404", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testUser = {
      name: `FullNav ${timestamp}`,
      email: `fullnav-${timestamp}@example.com`,
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

    // Get org slug from URL
    const dashboardUrl = page.url();
    const orgSlugMatch = dashboardUrl.match(ORG_SLUG_PATTERN);
    expect(orgSlugMatch).toBeTruthy();
    const orgSlug = orgSlugMatch?.[1] ?? "";

    // 2. Navigate to Boards page
    await page.goto(`/dashboard/${orgSlug}/boards`);
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", { name: "Boards", exact: true, level: 1 })
    ).toBeVisible({ timeout: 10_000 });

    // 3. Create a board and navigate to board detail
    await createBoard(page, "Test Board");
    await page.waitForTimeout(1000); // Wait for board to be created

    // Click on the created board
    const boardCard = page
      .getByRole("link", { name: TEST_BOARD_NAME_PATTERN })
      .first();
    await expect(boardCard).toBeVisible({ timeout: 10_000 });
    await boardCard.click();
    await expect(page).toHaveURL(BOARD_DETAIL_URL_PATTERN, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    // Verify no 404 on board detail page
    await expect(page.getByText("Board not found")).not.toBeVisible();

    // 4. Navigate to Settings page
    await page.goto(`/dashboard/${orgSlug}/settings`);
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", { name: "Settings", exact: true })
    ).toBeVisible({ timeout: 10_000 });

    // 5. Navigate to Settings > General
    await page.goto(`/dashboard/${orgSlug}/settings/general`);
    await page.waitForLoadState("networkidle");
    // Verify page renders (not 404)
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // 6. Navigate to Settings > Members
    await page.goto(`/dashboard/${orgSlug}/settings/members`);
    await page.waitForLoadState("networkidle");
    // Verify page renders (not 404)
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // 7. Navigate to Settings > Billing
    await page.goto(`/dashboard/${orgSlug}/settings/billing`);
    await page.waitForLoadState("networkidle");
    // Verify page renders (not 404)
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // 8. Navigate to Tags page
    await page.goto(`/dashboard/${orgSlug}/tags`);
    await page.waitForLoadState("networkidle");
    // Verify page renders (not 404)
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // 9. Navigate to Changelog page
    await page.goto(`/dashboard/${orgSlug}/changelog`);
    await page.waitForLoadState("networkidle");
    // Verify page renders (not 404)
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Check no 404 HTTP responses for any dashboard pages
    const dashboard404 = responses404.filter((url) =>
      url.includes("/dashboard")
    );
    expect(
      dashboard404.length,
      `Found 404 responses: ${dashboard404.join(", ")}`
    ).toBe(0);
  });

  test("should navigate public pages without 404", async ({ page }) => {
    const timestamp = Date.now();
    const testUser = {
      name: `PublicNav ${timestamp}`,
      email: `publicnav-${timestamp}@example.com`,
      password: "password123",
    };

    // Track 404 responses
    const responses404: string[] = [];
    page.on("response", (response) => {
      if (response.status() === 404) {
        responses404.push(response.url());
      }
    });

    // 1. Sign up to get to the dashboard and get the org slug
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

    await signUpNewUser(page, testUser);

    // Wait for the dashboard to load
    await page.waitForURL(DASHBOARD_URL_PATTERN, { timeout: 20_000 });
    await page.waitForLoadState("networkidle");

    // Get org slug from URL
    const dashboardUrl = page.url();
    const orgSlugMatch = dashboardUrl.match(ORG_SLUG_PATTERN);
    expect(orgSlugMatch).toBeTruthy();
    const orgSlug = orgSlugMatch?.[1] ?? "";

    // 2. Navigate to public organization page
    await page.goto(`/${orgSlug}`);
    await page.waitForLoadState("networkidle");
    // URL should end with the org slug
    expect(page.url()).toContain(`/${orgSlug}`);

    // 3. Navigate to public changelog page
    await page.goto(`/${orgSlug}/changelog`);
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain(`/${orgSlug}/changelog`);

    // 4. Navigate to public roadmap page
    await page.goto(`/${orgSlug}/roadmap`);
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain(`/${orgSlug}/roadmap`);

    // Check no 404 HTTP responses for public pages
    const public404 = responses404.filter(
      (url) =>
        url.includes(`/${orgSlug}`) &&
        !url.includes("/api/") &&
        !url.includes("/_next/")
    );
    expect(
      public404.length,
      `Found 404 responses: ${public404.join(", ")}`
    ).toBe(0);
  });
});
