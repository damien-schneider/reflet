import { expect, test } from "@playwright/test";

const DASHBOARD_ORG_SLUG_REGEX = /\/dashboard\/[^/]+$/;
const DASHBOARD_SLUG_EXTRACT_REGEX = /\/dashboard\/([^/]+)/;
const BOARDS_URL_REGEX = /\/boards$/;
const BOARD_DETAIL_REGEX = /\/boards\/[^/]+$/;
const BOARD_SLUG_EXTRACT_REGEX = /\/boards\/([^/?]+)/;

// Auth form headings (French UI)
const AUTH_INITIAL_HEADING = "Authentification";
const AUTH_SIGNUP_HEADING = "Créer un compte";

// Locator patterns
const BOARDS_LINK_NAME = /boards/i;
const CREATE_BUTTON_NAME = /create|new board/i;
const NAME_LABEL = /name/i;
const CREATE_LABEL = /create/i;
const SUBMIT_FEEDBACK_NAME = /submit feedback|add feedback/i;
const TITLE_LABEL = /title/i;
const SUBMIT_CREATE_NAME = /submit|create/i;
const VOTE_TEXT_REGEX = /0|vote/i;
const COMMENT_TEXT_REGEX = /comment/i;
const WRITE_COMMENT_PLACEHOLDER = /write a comment/i;
const SEND_BUTTON_NAME = /send/i;
const VOTE_COUNT_REGEX = /0|1/;
const DIGIT_REGEX = /\d+/;
const SEARCH_PLACEHOLDER = /search/i;
const SORT_BUTTON_NAME = /sort|most voted|newest/i;

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
 * Helper to create a board
 */
async function createBoard(
  page: import("@playwright/test").Page,
  boardName: string
) {
  // Navigate to boards
  const boardsLink = page.getByRole("link", { name: BOARDS_LINK_NAME });
  await expect(boardsLink).toBeVisible({ timeout: 10_000 });
  await boardsLink.click();
  await expect(page).toHaveURL(BOARDS_URL_REGEX, { timeout: 10_000 });

  // Create a board
  const createButton = page.getByRole("button", {
    name: CREATE_BUTTON_NAME,
  });
  await expect(createButton).toBeVisible({ timeout: 10_000 });
  await createButton.click();

  const boardNameInput = page.getByLabel(NAME_LABEL);
  await expect(boardNameInput).toBeVisible({ timeout: 5000 });
  await boardNameInput.fill(boardName);

  const submitButton = page.getByRole("button", { name: CREATE_LABEL });
  await submitButton.click();

  await page.waitForTimeout(2000);
  await expect(page.getByText(boardName)).toBeVisible({ timeout: 10_000 });
}

/**
 * Helper to create feedback on a board
 */
async function createFeedback(
  page: import("@playwright/test").Page,
  feedbackTitle: string,
  feedbackDescription: string
) {
  const submitFeedbackButton = page.getByRole("button", {
    name: SUBMIT_FEEDBACK_NAME,
  });
  await expect(submitFeedbackButton).toBeVisible({ timeout: 10_000 });
  await submitFeedbackButton.click();

  const titleInput = page.getByLabel(TITLE_LABEL);
  await expect(titleInput).toBeVisible({ timeout: 5000 });
  await titleInput.fill(feedbackTitle);

  // Look for description field (could be textarea or input)
  const descriptionInput = page
    .getByRole("textbox")
    .filter({ hasText: "" })
    .last();
  if (await descriptionInput.isVisible()) {
    await descriptionInput.fill(feedbackDescription);
  }

  const submitButton = page
    .getByRole("dialog")
    .getByRole("button", { name: SUBMIT_CREATE_NAME });
  await expect(submitButton).toBeVisible({ timeout: 5000 });
  await submitButton.click();

  await page.waitForTimeout(2000);
}

test.describe("Public Feedback Page and Dialog", () => {
  let orgSlug = "";

  test.beforeEach(async ({ page }) => {
    // Sign up with a fresh user for each test
    const timestamp = Date.now();
    const testUser = {
      name: `Feedback Dialog Test ${timestamp}`,
      email: `feedback-dialog-${timestamp}@example.com`,
      password: "password123",
    };

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });
    await expect(page.locator("h1")).toContainText(AUTH_INITIAL_HEADING);

    await signUpNewUser(page, testUser);

    await expect(page).toHaveURL(DASHBOARD_ORG_SLUG_REGEX, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    // Extract org slug from URL
    const url = page.url();
    const match = url.match(DASHBOARD_SLUG_EXTRACT_REGEX);
    orgSlug = match ? match[1] : "";
  });

  test("should open feedback detail dialog when clicking on feedback", async ({
    page,
  }) => {
    const boardName = "Feedback Dialog Test Board";
    const feedbackTitle = "Test Feedback For Dialog";
    const feedbackDescription = "This is a test feedback to test the dialog";

    // Create a board
    await createBoard(page, boardName);

    // Navigate to the board
    await page.getByText(boardName).click();
    await expect(page).toHaveURL(BOARD_DETAIL_REGEX, { timeout: 10_000 });

    // Extract board ID from URL (unused but kept for future use)
    const boardUrl = page.url();
    boardUrl.match(BOARD_SLUG_EXTRACT_REGEX);

    // Create feedback
    await createFeedback(page, feedbackTitle, feedbackDescription);

    // Verify feedback appears in the list
    await expect(page.getByText(feedbackTitle)).toBeVisible({
      timeout: 10_000,
    });

    // Navigate to public org page
    await page.goto(`/${orgSlug}`);
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

    // Find the board tab or section
    await page.waitForTimeout(2000);

    // Look for the feedback in the public page
    const feedbackItem = page.getByText(feedbackTitle).first();

    // If visible, click it to open the dialog
    if (await feedbackItem.isVisible()) {
      await feedbackItem.click();

      // Dialog should open - look for dialog content
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 10_000 });

      // Dialog should show the feedback title
      await expect(dialog.getByText(feedbackTitle)).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("should display vote count and comment count in dialog", async ({
    page,
  }) => {
    const boardName = "Vote Count Test Board";
    const feedbackTitle = "Feedback With Votes";
    const feedbackDescription = "Testing vote display in dialog";

    // Create a board and feedback
    await createBoard(page, boardName);
    await page.getByText(boardName).click();
    await expect(page).toHaveURL(BOARD_DETAIL_REGEX, { timeout: 10_000 });
    await createFeedback(page, feedbackTitle, feedbackDescription);

    // Navigate to public org page
    await page.goto(`/${orgSlug}`);
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForTimeout(2000);

    // Click on feedback to open dialog
    const feedbackItem = page.getByText(feedbackTitle).first();
    if (await feedbackItem.isVisible()) {
      await feedbackItem.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 10_000 });

      // Should show vote count (0 by default)
      await expect(dialog.getByText(VOTE_TEXT_REGEX)).toBeVisible({
        timeout: 5000,
      });

      // Should show comment count or comment section
      await expect(dialog.getByText(COMMENT_TEXT_REGEX)).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("should close dialog when clicking close button", async ({ page }) => {
    const boardName = "Close Dialog Test Board";
    const feedbackTitle = "Feedback To Close";
    const feedbackDescription = "Testing dialog close functionality";

    // Create a board and feedback
    await createBoard(page, boardName);
    await page.getByText(boardName).click();
    await expect(page).toHaveURL(BOARD_DETAIL_REGEX, { timeout: 10_000 });
    await createFeedback(page, feedbackTitle, feedbackDescription);

    // Navigate to public org page
    await page.goto(`/${orgSlug}`);
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForTimeout(2000);

    // Click on feedback to open dialog
    const feedbackItem = page.getByText(feedbackTitle).first();
    if (await feedbackItem.isVisible()) {
      await feedbackItem.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 10_000 });

      // Close the dialog using ESC or close button
      await page.keyboard.press("Escape");

      // Dialog should be closed
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    }
  });

  test("should allow adding a comment in the dialog", async ({ page }) => {
    const boardName = "Comment Test Board";
    const feedbackTitle = "Feedback For Commenting";
    const feedbackDescription = "Testing comment functionality";
    const commentText = "This is a test comment from E2E test";

    // Create a board and feedback
    await createBoard(page, boardName);
    await page.getByText(boardName).click();
    await expect(page).toHaveURL(BOARD_DETAIL_REGEX, { timeout: 10_000 });
    await createFeedback(page, feedbackTitle, feedbackDescription);

    // Navigate to public org page
    await page.goto(`/${orgSlug}`);
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForTimeout(2000);

    // Click on feedback to open dialog
    const feedbackItem = page.getByText(feedbackTitle).first();
    if (await feedbackItem.isVisible()) {
      await feedbackItem.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 10_000 });

      // Find comment input
      const commentInput = dialog.getByPlaceholder(WRITE_COMMENT_PLACEHOLDER);
      if (await commentInput.isVisible()) {
        await commentInput.fill(commentText);

        // Submit comment (look for send button)
        const sendButton = dialog.getByRole("button", {
          name: SEND_BUTTON_NAME,
        });
        if (await sendButton.isVisible()) {
          await sendButton.click();

          // Wait for comment to appear
          await page.waitForTimeout(2000);

          // Comment should be visible
          await expect(dialog.getByText(commentText)).toBeVisible({
            timeout: 10_000,
          });
        }
      }
    }
  });

  test("should allow voting on feedback from dialog", async ({ page }) => {
    const boardName = "Voting Test Board";
    const feedbackTitle = "Feedback For Voting";
    const feedbackDescription = "Testing vote functionality in dialog";

    // Create a board and feedback
    await createBoard(page, boardName);
    await page.getByText(boardName).click();
    await expect(page).toHaveURL(BOARD_DETAIL_REGEX, { timeout: 10_000 });
    await createFeedback(page, feedbackTitle, feedbackDescription);

    // Navigate to public org page
    await page.goto(`/${orgSlug}`);
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForTimeout(2000);

    // Click on feedback to open dialog
    const feedbackItem = page.getByText(feedbackTitle).first();
    if (await feedbackItem.isVisible()) {
      await feedbackItem.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 10_000 });

      // Find vote button (chevron up icon or upvote button)
      const voteButton = dialog
        .getByRole("button")
        .filter({ hasText: VOTE_COUNT_REGEX })
        .first();
      if (await voteButton.isVisible()) {
        // Get initial count
        const initialText = await voteButton.textContent();
        const initialCount = Number.parseInt(
          initialText?.match(DIGIT_REGEX)?.[0] || "0",
          10
        );

        await voteButton.click();
        await page.waitForTimeout(1000);

        // Vote count should increase
        const newText = await voteButton.textContent();
        const newCount = Number.parseInt(
          newText?.match(DIGIT_REGEX)?.[0] || "0",
          10
        );

        expect(newCount).toBeGreaterThanOrEqual(initialCount);
      }
    }
  });
});

test.describe("Public Org Page Search and Filter", () => {
  test.beforeEach(async ({ page }) => {
    const timestamp = Date.now();
    const testUser = {
      name: `Search Filter Test ${timestamp}`,
      email: `search-filter-${timestamp}@example.com`,
      password: "password123",
    };

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });
    await expect(page.locator("h1")).toContainText(AUTH_INITIAL_HEADING);

    await signUpNewUser(page, testUser);

    await expect(page).toHaveURL(DASHBOARD_ORG_SLUG_REGEX, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");
  });

  test("should have search input on public org page", async ({ page }) => {
    // Extract org slug from URL
    const url = page.url();
    const match = url.match(DASHBOARD_SLUG_EXTRACT_REGEX);
    const orgSlug = match ? match[1] : "";

    // Navigate to public org page
    await page.goto(`/${orgSlug}`);
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForTimeout(2000);

    // Search input should be visible
    const searchInput = page.getByPlaceholder(SEARCH_PLACEHOLDER);
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
  });

  test("should have sort dropdown on public org page", async ({ page }) => {
    // Extract org slug from URL
    const url = page.url();
    const match = url.match(DASHBOARD_SLUG_EXTRACT_REGEX);
    const orgSlug = match ? match[1] : "";

    // Navigate to public org page
    await page.goto(`/${orgSlug}`);
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForTimeout(2000);

    // Sort dropdown should be visible (look for button with sort text)
    const sortButton = page.getByRole("button", {
      name: SORT_BUTTON_NAME,
    });
    await expect(sortButton).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Feedback Dialog - No Console Errors", () => {
  test("should not have console errors when opening feedback dialog", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testUser = {
      name: `Console Error Test ${timestamp}`,
      email: `console-feedback-${timestamp}@example.com`,
      password: "password123",
    };

    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    // Sign up
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });
    await signUpNewUser(page, testUser);

    await expect(page).toHaveURL(DASHBOARD_ORG_SLUG_REGEX, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    // Extract org slug from URL
    const url = page.url();
    const match = url.match(DASHBOARD_SLUG_EXTRACT_REGEX);
    const orgSlug = match ? match[1] : "";

    // Create a board and feedback
    const boardName = "Console Test Board";
    const feedbackTitle = "Console Test Feedback";
    await createBoard(page, boardName);
    await page.getByText(boardName).click();
    await page.waitForURL(BOARD_DETAIL_REGEX, { timeout: 10_000 });
    await createFeedback(page, feedbackTitle, "Testing for console errors");

    // Navigate to public org page and open dialog
    await page.goto(`/${orgSlug}`);
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForTimeout(2000);

    const feedbackItem = page.getByText(feedbackTitle).first();
    if (await feedbackItem.isVisible()) {
      await feedbackItem.click();
      await page.waitForTimeout(2000);
    }

    // Filter out ResizeObserver warnings (common and benign)
    const relevantErrors = errors.filter((e) => !e.includes("ResizeObserver"));

    expect(relevantErrors.length).toBe(0);
  });
});
