import { expect, test } from "@playwright/test";

const CREATE_ACCOUNT_HEADING = /Create Account/i;
const DASHBOARD_URL_REGEX = /\/dashboard\/[^/]+$/;
const BOARDS_LINK_REGEX = /Boards/i;
const BOARDS_URL_REGEX = /\/dashboard\/[^/]+\/boards$/;
const CREATE_BOARD_BUTTON_TEXT = "Create Board";
const CREATE_SUBMIT_BUTTON_REGEX = /^Create$/;
const BOARD_DETAIL_URL_REGEX = /\/dashboard\/[^/]+\/boards\/[^/]+/;
const ADD_FEEDBACK_BUTTON_REGEX = /Add Feedback/i;
const ORG_SLUG_EXTRACT_REGEX = /\/dashboard\/([^/]+)$/;
const BOARD_SLUG_EXTRACT_REGEX = /\/boards\/([^/]+)/;

/**
 * Helper function to click the Create Board button and wait for dialog
 * Sometimes the first click doesn't register with Base UI components
 */
async function clickCreateBoardAndWaitForDialog(
  page: import("@playwright/test").Page
) {
  const createBoardBtns = page.getByRole("button", {
    name: CREATE_BOARD_BUTTON_TEXT,
  });
  await expect(createBoardBtns.first()).toBeVisible({ timeout: 10_000 });

  await createBoardBtns.first().click();

  try {
    await page
      .locator('[data-slot="dialog-content"]')
      .waitFor({ state: "visible", timeout: 3000 });
  } catch {
    // Try clicking again if dialog doesn't appear
    await createBoardBtns.first().click();
    await page
      .locator('[data-slot="dialog-content"]')
      .waitFor({ state: "visible", timeout: 10_000 });
  }
}

test.describe("Board Detail Direct Navigation", () => {
  /**
   * This test verifies that navigating directly to a board detail URL
   * (e.g., /dashboard/my-organization/boards/my-board) displays the
   * specific board detail page, NOT the boards list page.
   *
   * This is a regression test for a routing issue where the board detail
   * page was not being rendered when accessed via direct URL navigation.
   */
  test("should display the specific board when navigating directly to its URL", async ({
    page,
  }) => {
    // 1. Sign up to get to the dashboard
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: CREATE_ACCOUNT_HEADING })
    ).toBeVisible({ timeout: 15_000 });

    const timestamp = Date.now();
    const TEST_USER = {
      name: `Board Detail Test ${timestamp}`,
      email: `board-detail-${timestamp}@example.com`,
      password: "password123",
    };

    await page.getByTestId("name-input").fill(TEST_USER.name);
    await page.getByTestId("email-input").fill(TEST_USER.email);
    await page.getByTestId("password-input").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Sign Up" }).click();

    // 2. Wait for dashboard to load
    await expect(page).toHaveURL(DASHBOARD_URL_REGEX, { timeout: 20_000 });

    const dashboardUrl = page.url();
    const orgSlugMatch = dashboardUrl.match(ORG_SLUG_EXTRACT_REGEX);
    expect(orgSlugMatch).toBeTruthy();
    const orgSlug = orgSlugMatch?.[1] ?? "";

    // 3. Navigate to Boards via sidebar and create a board
    await page.getByRole("link", { name: BOARDS_LINK_REGEX }).click();
    await expect(page).toHaveURL(BOARDS_URL_REGEX, { timeout: 15_000 });

    const boardName = "Direct Nav Test Board";
    await clickCreateBoardAndWaitForDialog(page);

    const boardNameInput = page.getByLabel("Board name");
    await expect(boardNameInput).toBeVisible({ timeout: 5000 });
    await boardNameInput.fill(boardName);
    await page
      .getByRole("button", { name: CREATE_SUBMIT_BUTTON_REGEX })
      .click();

    // Wait for board to appear in the grid
    const boardCard = page.getByRole("link", {
      name: new RegExp(boardName, "i"),
    });
    await expect(boardCard).toBeVisible({ timeout: 15_000 });

    // Extract the board slug from the card's href
    const boardHref = await boardCard.getAttribute("href");
    expect(boardHref).toBeTruthy();
    const boardSlugMatch = boardHref?.match(BOARD_SLUG_EXTRACT_REGEX);
    expect(boardSlugMatch).toBeTruthy();
    const boardSlug = boardSlugMatch?.[1] ?? "";

    // 4. Navigate away from boards page (go to dashboard home)
    await page.goto(`/dashboard/${orgSlug}`);
    await expect(page).toHaveURL(DASHBOARD_URL_REGEX, { timeout: 15_000 });

    // 5. NOW TEST THE DIRECT NAVIGATION: Go directly to the board detail URL
    const boardDetailUrl = `/dashboard/${orgSlug}/boards/${boardSlug}`;
    await page.goto(boardDetailUrl);

    // 6. Verify we're on the board detail page URL
    await expect(page).toHaveURL(BOARD_DETAIL_URL_REGEX, { timeout: 15_000 });

    // 7. Verify we see the board detail page content, NOT the boards list
    // The board detail page should show:
    // - The board name as a heading (NOT "Boards" heading from list page)
    // - The "Add Feedback" button
    // - NOT the "Create Board" button (which is on the list page)
    await expect(page.getByRole("heading", { name: boardName })).toBeVisible({
      timeout: 10_000,
    });

    // The board detail page should have at least one "Add Feedback" button visible
    await expect(
      page.getByRole("button", { name: ADD_FEEDBACK_BUTTON_REGEX }).first()
    ).toBeVisible();

    // Verify we're NOT on the boards list page
    await expect(
      page.getByRole("button", { name: CREATE_BOARD_BUTTON_TEXT })
    ).not.toBeVisible();
  });

  /**
   * This test verifies that after navigating to a board via clicking,
   * refreshing the page preserves the board detail view.
   */
  test("should preserve board detail view on page refresh", async ({
    page,
  }) => {
    // 1. Sign up
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: CREATE_ACCOUNT_HEADING })
    ).toBeVisible({ timeout: 15_000 });

    const timestamp = Date.now();
    const TEST_USER = {
      name: `Refresh Test ${timestamp}`,
      email: `refresh-test-${timestamp}@example.com`,
      password: "password123",
    };

    await page.getByTestId("name-input").fill(TEST_USER.name);
    await page.getByTestId("email-input").fill(TEST_USER.email);
    await page.getByTestId("password-input").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Sign Up" }).click();

    await expect(page).toHaveURL(DASHBOARD_URL_REGEX, { timeout: 20_000 });

    // 2. Create a board
    await page.getByRole("link", { name: BOARDS_LINK_REGEX }).click();
    await expect(page).toHaveURL(BOARDS_URL_REGEX, { timeout: 15_000 });

    const boardName = "Refresh Test Board";
    await clickCreateBoardAndWaitForDialog(page);

    const boardNameInput = page.getByLabel("Board name");
    await expect(boardNameInput).toBeVisible({ timeout: 5000 });
    await boardNameInput.fill(boardName);
    await page
      .getByRole("button", { name: CREATE_SUBMIT_BUTTON_REGEX })
      .click();

    const boardCard = page.getByRole("link", {
      name: new RegExp(boardName, "i"),
    });
    await expect(boardCard).toBeVisible({ timeout: 15_000 });

    // 3. Click to go to board detail
    await boardCard.click();

    // Verify we're on board detail
    await expect(page).toHaveURL(BOARD_DETAIL_URL_REGEX, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: boardName })).toBeVisible({
      timeout: 10_000,
    });

    // 4. Refresh the page
    await page.reload();

    // 5. After refresh, we should still be on the board detail page
    await expect(page).toHaveURL(BOARD_DETAIL_URL_REGEX, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: boardName })).toBeVisible({
      timeout: 10_000,
    });
    // The board detail page should have at least one "Add Feedback" button visible
    await expect(
      page.getByRole("button", { name: ADD_FEEDBACK_BUTTON_REGEX }).first()
    ).toBeVisible();

    // NOT on the boards list
    await expect(
      page.getByRole("button", { name: CREATE_BOARD_BUTTON_TEXT })
    ).not.toBeVisible();
  });
});
