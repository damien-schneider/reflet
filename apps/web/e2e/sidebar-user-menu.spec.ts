import { expect, test } from "@playwright/test";

const TEST_USER = {
  name: "test",
  email: `test-${Date.now()}@mail.com`,
  password: "password123",
};

const DASHBOARD_URL_PATTERN = /\/dashboard\/[^/]+$/;

test.describe("Sidebar User Menu", () => {
  test("should open user menu as a submenu", async ({ page }) => {
    // 1. Sign up to get to the dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

    await page.getByTestId("name-input").fill(TEST_USER.name);
    await page.getByTestId("email-input").fill(TEST_USER.email);
    await page.getByTestId("password-input").fill(TEST_USER.password);

    await page.getByRole("button", { name: "Sign Up" }).click();

    // Wait for the dashboard to load (redirect to /dashboard/xyz)
    await page.waitForURL(DASHBOARD_URL_PATTERN, { timeout: 20_000 });
    await page.waitForLoadState("networkidle");

    // 2. Find the user menu button in the footer and click it
    const userButton = page
      .locator("aside button")
      .filter({ hasText: TEST_USER.name });
    await expect(userButton).toBeVisible({ timeout: 15_000 });
    await userButton.click();

    // 3. Check if "Sign out" appears (it's now a submenu item)
    await expect(page.getByText("Sign out")).toBeVisible({ timeout: 10_000 });
  });
});
