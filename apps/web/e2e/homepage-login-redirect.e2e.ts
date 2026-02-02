import { expect, test } from "@playwright/test";

// Auth form heading (French UI)
const AUTH_INITIAL_HEADING = "Authentification";

// URL pattern for dashboard
const DASHBOARD_URL_PATTERN = /\/dashboard/;

test.describe("Homepage Login Redirect", () => {
  test.beforeEach(async ({ context }) => {
    // Ensure user is logged out
    await context.clearCookies();
  });

  test("should redirect to auth form when clicking Log in from homepage navbar", async ({
    page,
  }) => {
    // Start on the homepage
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

    // Wait for animations to complete
    await page.waitForTimeout(1000);

    // Find and click the "Log in" link in the navbar
    const loginLink = page.getByRole("link", { name: "Log in" }).first();
    await expect(loginLink).toBeVisible({ timeout: 10_000 });
    await loginLink.click();

    // Should navigate to /dashboard and show the auth form
    await page.waitForURL(DASHBOARD_URL_PATTERN, { timeout: 15_000 });

    // Verify we're on the dashboard URL
    await expect(page).toHaveURL(DASHBOARD_URL_PATTERN, { timeout: 5000 });

    // Verify the auth form is displayed (user is not logged in)
    await page.waitForSelector("h1", { state: "visible", timeout: 15_000 });
    await expect(page.locator("h1")).toContainText(AUTH_INITIAL_HEADING, {
      timeout: 10_000,
    });
  });
});
