import { expect, test } from "@playwright/test";

const DASHBOARD_ORG_SLUG_REGEX = /\/dashboard\/[^/]+$/;
const BOARDS_URL_REGEX = /\/boards$/;
const BOARD_DETAIL_REGEX = /\/boards\/[^/]+$/;
const BOARD_SETTINGS_REGEX = /\/boards\/[^/]+\/settings$/;
const VIEW_FEED_REGEX = /view=feed/;
const VIEW_ROADMAP_REGEX = /view=roadmap/;

// Locator patterns
const BOARDS_LINK_NAME = /boards/i;
const CREATE_BUTTON_NAME = /create|new board/i;
const NAME_LABEL = /name/i;
const DESCRIPTION_LABEL = /description/i;
const CREATE_LABEL = /create/i;
const ROADMAP_BUTTON_NAME = /roadmap/i;
const FEED_BUTTON_NAME = /feed/i;
const SETTINGS_LINK_NAME = /settings/i;
const STATUSES_TEXT = /statuses/i;

// Auth form headings (French UI)
const AUTH_INITIAL_HEADING = "Authentification";
const AUTH_SIGNUP_HEADING = "Créer un compte";

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

test.describe("Board Views Feature", () => {
  test.beforeEach(async ({ page }) => {
    // Sign up with a fresh user for each test
    const timestamp = Date.now();
    const testUser = {
      name: `Board Views Test ${timestamp}`,
      email: `board-views-${timestamp}@example.com`,
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

  test("should navigate to boards page", async ({ page }) => {
    // Navigate to boards via sidebar
    const boardsLink = page.getByRole("link", { name: BOARDS_LINK_NAME });
    await expect(boardsLink).toBeVisible({ timeout: 10_000 });
    await boardsLink.click();

    await expect(page).toHaveURL(BOARDS_URL_REGEX, { timeout: 10_000 });
    await expect(page.getByText("Boards")).toBeVisible({ timeout: 10_000 });
  });

  test("should create a new board", async ({ page }) => {
    // Navigate to boards page
    const boardsLink = page.getByRole("link", { name: BOARDS_LINK_NAME });
    await expect(boardsLink).toBeVisible({ timeout: 10_000 });
    await boardsLink.click();
    await expect(page).toHaveURL(BOARDS_URL_REGEX, { timeout: 10_000 });

    // Look for create board button
    const createButton = page.getByRole("button", {
      name: CREATE_BUTTON_NAME,
    });
    await expect(createButton).toBeVisible({ timeout: 10_000 });
    await createButton.click();

    // Fill in board details in dialog
    const boardNameInput = page.getByLabel(NAME_LABEL);
    await expect(boardNameInput).toBeVisible({ timeout: 5000 });
    await boardNameInput.fill("Test Board E2E");

    // Optional: fill description if available
    const descriptionInput = page.getByLabel(DESCRIPTION_LABEL);
    if (await descriptionInput.isVisible()) {
      await descriptionInput.fill("This is a test board created by E2E tests");
    }

    // Submit the form
    const submitButton = page.getByRole("button", { name: CREATE_LABEL });
    await submitButton.click();

    // Verify board was created (should navigate to board detail or show in list)
    await page.waitForTimeout(2000);
    await expect(page.getByText("Test Board E2E")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("should show board view toggle on board detail page", async ({
    page,
  }) => {
    // Navigate to boards
    const boardsLink = page.getByRole("link", { name: BOARDS_LINK_NAME });
    await expect(boardsLink).toBeVisible({ timeout: 10_000 });
    await boardsLink.click();
    await expect(page).toHaveURL(BOARDS_URL_REGEX, { timeout: 10_000 });

    // Create a board first
    const createButton = page.getByRole("button", {
      name: CREATE_BUTTON_NAME,
    });
    await expect(createButton).toBeVisible({ timeout: 10_000 });
    await createButton.click();

    const boardNameInput = page.getByLabel(NAME_LABEL);
    await expect(boardNameInput).toBeVisible({ timeout: 5000 });
    await boardNameInput.fill("View Toggle Test Board");

    const submitButton = page.getByRole("button", { name: CREATE_LABEL });
    await submitButton.click();

    await page.waitForTimeout(2000);

    // Click on the board to go to detail page
    const boardCard = page.getByText("View Toggle Test Board");
    await expect(boardCard).toBeVisible({ timeout: 10_000 });
    await boardCard.click();

    // Should be on board detail page
    await expect(page).toHaveURL(BOARD_DETAIL_REGEX, { timeout: 10_000 });

    // View toggle should be visible
    const roadmapButton = page.getByRole("button", {
      name: ROADMAP_BUTTON_NAME,
    });
    const feedButton = page.getByRole("button", { name: FEED_BUTTON_NAME });

    await expect(roadmapButton).toBeVisible({ timeout: 10_000 });
    await expect(feedButton).toBeVisible({ timeout: 10_000 });
  });

  test("should switch between roadmap and feed views", async ({ page }) => {
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
    await boardNameInput.fill("View Switching Test");

    const submitButton = page.getByRole("button", { name: CREATE_LABEL });
    await submitButton.click();

    await page.waitForTimeout(2000);

    // Navigate to board detail
    const boardCard = page.getByText("View Switching Test");
    await expect(boardCard).toBeVisible({ timeout: 10_000 });
    await boardCard.click();

    await expect(page).toHaveURL(BOARD_DETAIL_REGEX, { timeout: 10_000 });

    // Click Feed view
    const feedButton = page.getByRole("button", { name: FEED_BUTTON_NAME });
    await expect(feedButton).toBeVisible({ timeout: 10_000 });
    await feedButton.click();

    // URL should reflect view parameter
    await expect(page).toHaveURL(VIEW_FEED_REGEX, { timeout: 5000 });

    // Click Roadmap view
    const roadmapButton = page.getByRole("button", {
      name: ROADMAP_BUTTON_NAME,
    });
    await expect(roadmapButton).toBeVisible({ timeout: 10_000 });
    await roadmapButton.click();

    // URL should reflect view parameter
    await expect(page).toHaveURL(VIEW_ROADMAP_REGEX, { timeout: 5000 });
  });

  test("should navigate to board settings", async ({ page }) => {
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
    await boardNameInput.fill("Settings Test Board");

    const submitButton = page.getByRole("button", { name: CREATE_LABEL });
    await submitButton.click();

    await page.waitForTimeout(2000);

    // Navigate to board detail
    const boardCard = page.getByText("Settings Test Board");
    await expect(boardCard).toBeVisible({ timeout: 10_000 });
    await boardCard.click();

    await expect(page).toHaveURL(BOARD_DETAIL_REGEX, { timeout: 10_000 });

    // Click settings link/button
    const settingsButton = page.getByRole("link", { name: SETTINGS_LINK_NAME });
    await expect(settingsButton).toBeVisible({ timeout: 10_000 });
    await settingsButton.click();

    // Should be on settings page
    await expect(page).toHaveURL(BOARD_SETTINGS_REGEX, {
      timeout: 10_000,
    });

    // Should see status manager
    await expect(page.getByText(STATUSES_TEXT)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("should show roadmap kanban view with status columns", async ({
    page,
  }) => {
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
    await boardNameInput.fill("Kanban Test Board");

    const submitButton = page.getByRole("button", { name: CREATE_LABEL });
    await submitButton.click();

    await page.waitForTimeout(2000);

    // Navigate to board detail
    const boardCard = page.getByText("Kanban Test Board");
    await expect(boardCard).toBeVisible({ timeout: 10_000 });
    await boardCard.click();

    await expect(page).toHaveURL(BOARD_DETAIL_REGEX, { timeout: 10_000 });

    // Make sure we're on roadmap view
    const roadmapButton = page.getByRole("button", {
      name: ROADMAP_BUTTON_NAME,
    });
    await expect(roadmapButton).toBeVisible({ timeout: 10_000 });
    await roadmapButton.click();

    // Should see kanban columns (default statuses are created)
    // Look for listbox role (columns) or status names
    await page.waitForTimeout(2000);

    // Kanban columns should be visible (they have role="listbox")
    const columns = page.locator('[role="listbox"]');
    await expect(columns.first()).toBeVisible({ timeout: 10_000 });
  });

  test("should keep roadmap scrolling within its scroll area on small screens", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 600, height: 500 });

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
    await boardNameInput.fill("Scroll Area Test Board");

    const submitButton = page.getByRole("button", { name: CREATE_LABEL });
    await submitButton.click();

    await page.waitForTimeout(2000);

    // Navigate to board detail
    const boardCard = page.getByText("Scroll Area Test Board");
    await expect(boardCard).toBeVisible({ timeout: 10_000 });
    await boardCard.click();

    await expect(page).toHaveURL(BOARD_DETAIL_REGEX, { timeout: 10_000 });

    // Switch to roadmap view
    const roadmapButton = page.getByRole("button", {
      name: ROADMAP_BUTTON_NAME,
    });
    await expect(roadmapButton).toBeVisible({ timeout: 10_000 });
    await roadmapButton.click();

    const scrollArea = page.getByTestId("roadmap-kanban-scrollarea");
    await expect(scrollArea).toBeVisible({ timeout: 10_000 });

    const viewport = scrollArea.locator("[data-slot='scroll-area-viewport']");
    await expect(viewport).toBeVisible({ timeout: 10_000 });

    await expect(page.locator('[role="listbox"]').first()).toBeVisible({
      timeout: 10_000,
    });

    const { scrollWidth, clientWidth } = await viewport.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));

    expect(scrollWidth).toBeGreaterThan(clientWidth);

    const initialWindowScroll = await page.evaluate(() => window.scrollY);
    const initialScrollLeft = await viewport.evaluate((el) => el.scrollLeft);

    await viewport.scrollIntoViewIfNeeded();
    await viewport.hover();
    await page.mouse.wheel(0, 600);

    await expect
      .poll(async () => viewport.evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(initialScrollLeft);

    const finalWindowScroll = await page.evaluate(() => window.scrollY);
    expect(finalWindowScroll).toBe(initialWindowScroll);
  });
});

test.describe("Board Views - No Console Errors", () => {
  test("should not have console errors on board views", async ({ page }) => {
    const timestamp = Date.now();
    const testUser = {
      name: `Console Board Test ${timestamp}`,
      email: `console-board-${timestamp}@example.com`,
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

    // Navigate to boards
    const boardsLink = page.getByRole("link", { name: BOARDS_LINK_NAME });
    await expect(boardsLink).toBeVisible({ timeout: 10_000 });
    await boardsLink.click();

    await page.waitForTimeout(2000);

    // Filter out ResizeObserver warnings (common and benign)
    const relevantErrors = errors.filter((e) => !e.includes("ResizeObserver"));

    expect(relevantErrors.length).toBe(0);
  });
});
