import { expect, test } from "@playwright/test";

const CREATE_ACCOUNT_HEADING = /Create Account/i;
const DASHBOARD_URL_REGEX = /\/dashboard\/[^/]+$/;
const BOARDS_LINK_REGEX = /Boards/i;
const BOARDS_URL_REGEX = /\/dashboard\/[^/]+\/boards$/;
const CREATE_BOARD_BUTTON_REGEX = /Create Board/i;
const FILL_BOARD_NAME_REGEX = /Feature Requests/i;
const CREATE_SUBMIT_BUTTON_REGEX = /^Create$/;
const BOARD_DETAIL_URL_REGEX = /\/dashboard\/[^/]+\/boards\/[^/]+/;
const ADD_FEEDBACK_BUTTON_REGEX = /Add Feedback/i;

test.describe("Dashboard Navigation", () => {
  test("should navigate to board details when a board card is clicked", async ({
    page,
  }) => {
    // 1. Sign up to get to the dashboard
    await page.goto("/dashboard");

    // Wait for the sign up form to be visible by searching for the "Create Account" heading
    await expect(
      page.getByRole("heading", { name: CREATE_ACCOUNT_HEADING })
    ).toBeVisible({ timeout: 15_000 });

    const timestamp = Date.now();
    const TEST_USER = {
      name: `Nav Test User ${timestamp}`,
      email: `nav-test-${timestamp}@example.com`,
      password: "password123",
    };

    await page.getByTestId("name-input").fill(TEST_USER.name);
    await page.getByTestId("email-input").fill(TEST_USER.email);
    await page.getByTestId("password-input").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Sign Up" }).click();

    // 2. Wait for dashboard to load (redirects to /dashboard/personal-org-slug)
    await expect(page).toHaveURL(DASHBOARD_URL_REGEX, { timeout: 20_000 });

    // 3. Navigate to Boards via sidebar
    // We use getByRole('link', { name: /Boards/i }) which matches our DashboardSidebar implementation
    await page.getByRole("link", { name: BOARDS_LINK_REGEX }).click();
    await expect(page).toHaveURL(BOARDS_URL_REGEX, {
      timeout: 15_000,
    });

    // 4. Create a board first so we have something to click
    await page.getByRole("button", { name: CREATE_BOARD_BUTTON_REGEX }).click();
    await page.getByPlaceholder(FILL_BOARD_NAME_REGEX).fill("My Test Board");
    await page
      .getByRole("button", { name: CREATE_SUBMIT_BUTTON_REGEX })
      .click();

    // Wait for board to appear in the grid
    const boardCard = page
      .locator('main a[href*="/boards/"]')
      .filter({ hasText: "My Test Board" });
    await expect(boardCard).toBeVisible({ timeout: 15_000 });

    // 5. Click the board card
    await boardCard.click();

    // 6. Check if URL changed to the board detail page
    // Using a more lenient regex to handle trailing slashes if present
    await expect(page).toHaveURL(BOARD_DETAIL_URL_REGEX, {
      timeout: 10_000,
    });

    // 7. Verify we are on the board detail page
    await expect(
      page.getByRole("heading", { name: "My Test Board" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: ADD_FEEDBACK_BUTTON_REGEX })
    ).toBeVisible();
  });
});
