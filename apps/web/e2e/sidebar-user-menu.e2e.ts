import { expect, test } from "@playwright/test";
import {
  createTestEmail,
  createTestName,
  escapeRegex,
  signUpNewUserWithOrg,
} from "./helpers/auth";

const DASHBOARD_URL_PATTERN = /\/dashboard\/[^/]+$/;

test.describe("Sidebar User Menu", () => {
  test("should open user menu as a submenu", async ({ page }) => {
    const TEST_USER = {
      email: createTestEmail("sidebar-test"),
      password: "password123",
    };
    const orgName = createTestName("Sidebar Org");

    // 1. Sign up to get to the dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

    await signUpNewUserWithOrg(page, TEST_USER, orgName);

    // Wait for the dashboard to load (redirect to /dashboard/xyz)
    await page.waitForURL(DASHBOARD_URL_PATTERN, { timeout: 20_000 });
    await page.waitForLoadState("networkidle");

    // 2. Find the user menu button in the sidebar footer (the collapsible trigger)
    const userButton = page.getByRole("button", {
      name: new RegExp(escapeRegex(TEST_USER.email)),
    });
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
