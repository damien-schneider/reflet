import { expect, test } from "@playwright/test";

// Auth form headings (French UI)
const AUTH_SIGNUP_HEADING = "Créer un compte";

const DASHBOARD_URL_PATTERN = /\/dashboard\/[^/]+$/;

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

test.describe("Sidebar User Menu", () => {
  test("should open user menu as a submenu", async ({ page }) => {
    const timestamp = Date.now();
    const TEST_USER = {
      name: "SidebarTest",
      email: `sidebar-test-${timestamp}@mail.com`,
      password: "password123",
    };

    // 1. Sign up to get to the dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

    await signUpNewUser(page, TEST_USER);

    // Wait for the dashboard to load (redirect to /dashboard/xyz)
    await page.waitForURL(DASHBOARD_URL_PATTERN, { timeout: 20_000 });
    await page.waitForLoadState("networkidle");

    // 2. Find the user menu button in the sidebar footer (the collapsible trigger)
    const userButton = page.locator('[data-slot="collapsible-trigger"]');
    await expect(userButton).toBeVisible({ timeout: 15_000 });
    await userButton.click({ force: true });
    await page.waitForTimeout(500);

    // If Sign out not visible, try clicking again
    const signOutButton = page.getByText("Sign out");
    const isVisible = await signOutButton.isVisible();
    if (!isVisible) {
      await userButton.click({ force: true });
      await page.waitForTimeout(500);
    }

    // 3. Check if "Sign out" appears (it's a submenu item after expanding)
    await expect(signOutButton).toBeVisible({ timeout: 10_000 });
  });
});
