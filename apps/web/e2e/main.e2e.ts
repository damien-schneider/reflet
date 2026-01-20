import { expect, test } from "@playwright/test";

const DASHBOARD_ORG_SLUG_REGEX = /\/dashboard\/[^/]+$/;

// Auth form headings (French UI)
const AUTH_INITIAL_HEADING = "Authentification";
const AUTH_SIGNUP_HEADING = "Créer un compte";
const AUTH_SIGNIN_HEADING = "Bon retour parmi nous";

/**
 * Helper to complete sign-up flow with the new unified auth form
 * 1. Enter email and blur to trigger email check
 * 2. Wait for sign-up mode to activate
 * 3. Fill password and confirm password
 * 4. Submit
 */
async function signUpNewUser(
  page: import("@playwright/test").Page,
  user: { email: string; password: string }
) {
  // Enter email and blur to trigger email check
  await page.getByTestId("email-input").fill(user.email);
  await page.getByTestId("email-input").blur();

  // Wait for sign-up mode (new user)
  await expect(page.locator("h1")).toContainText(AUTH_SIGNUP_HEADING, {
    timeout: 10_000,
  });

  // Fill password and confirm password fields
  await page.getByTestId("password-input").fill(user.password);
  await page.getByTestId("confirm-password-input").fill(user.password);

  // Submit
  await page.getByRole("button", { name: "Créer mon compte" }).click();
}

/**
 * Helper to complete sign-in flow with the new unified auth form
 * 1. Enter email and blur to trigger email check
 * 2. Wait for sign-in mode to activate
 * 3. Fill password
 * 4. Submit
 */
async function signInExistingUser(
  page: import("@playwright/test").Page,
  user: { email: string; password: string }
) {
  // Enter email and blur to trigger email check
  await page.getByTestId("email-input").fill(user.email);
  await page.getByTestId("email-input").blur();

  // Wait for sign-in mode (existing user)
  await expect(page.locator("h1")).toContainText(AUTH_SIGNIN_HEADING, {
    timeout: 10_000,
  });

  // Fill password field
  await page.getByTestId("password-input").fill(user.password);

  // Submit
  await page.getByRole("button", { name: "Se connecter" }).click();
}

test.describe("Core Authentication Flows", () => {
  test("should allow sign up and redirect to dashboard", async ({ page }) => {
    const timestamp = Date.now();
    const testUser = {
      email: `test-${timestamp}@example.com`,
      password: "password123",
    };

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });
    await expect(page.locator("h1")).toContainText(AUTH_INITIAL_HEADING);

    await signUpNewUser(page, testUser);

    await expect(page).toHaveURL(DASHBOARD_ORG_SLUG_REGEX, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    // Verify we're on the dashboard by checking for dashboard-specific content
    await expect(page.getByText("Dashboard")).toBeVisible({ timeout: 10_000 });
  });

  test("should allow sign in and redirect to dashboard", async ({ page }) => {
    const timestamp = Date.now();
    const testUser = {
      email: `signin-test-${timestamp}@example.com`,
      password: "password123",
    };

    // First sign up
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });

    await signUpNewUser(page, testUser);

    await page.waitForURL(DASHBOARD_ORG_SLUG_REGEX, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    // Sign out by clearing session and going back to dashboard
    await page.context().clearCookies();
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });

    // Now sign in
    await signInExistingUser(page, testUser);

    await expect(page).toHaveURL(DASHBOARD_ORG_SLUG_REGEX, { timeout: 15_000 });
  });

  test("should allow sign out and redirect to auth form", async ({ page }) => {
    const timestamp = Date.now();
    const testUser = {
      email: `signout-test-${timestamp}@example.com`,
      password: "password123",
    };

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });

    await signUpNewUser(page, testUser);

    await page.waitForURL(DASHBOARD_ORG_SLUG_REGEX, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    // Find the user menu button in the sidebar footer (the collapsible trigger)
    // It contains the user's name and email
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

    // Click sign out (it's a submenu item)
    await expect(signOutButton).toBeVisible({ timeout: 5000 });
    await signOutButton.click({ force: true });

    await page.waitForTimeout(1000);

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

    await expect(page.locator("h1")).toContainText(AUTH_INITIAL_HEADING);
  });
});

test.describe("Protected Routes", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("should redirect to auth form when accessing dashboard without auth", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

    await expect(page.locator("h1")).toContainText(AUTH_INITIAL_HEADING);
  });
});

test.describe("UI Components - No Console Errors", () => {
  test("should not have MenuGroupRootContext errors on dashboard", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testUser = {
      email: `console-test-${timestamp}@example.com`,
      password: "password123",
    };

    const errors: string[] = [];

    page.on("console", (msg) => {
      if (
        msg.type() === "error" &&
        msg.text().includes("MenuGroupRootContext")
      ) {
        errors.push(msg.text());
      }
    });

    page.on("pageerror", (error) => {
      if (error.message.includes("MenuGroupRootContext")) {
        errors.push(error.message);
      }
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });

    await signUpNewUser(page, testUser);

    await page.waitForURL(DASHBOARD_ORG_SLUG_REGEX, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    await page.waitForTimeout(2000);

    expect(errors.length).toBe(0);
  });

  test("should not have any console errors on application load", async ({
    page,
  }) => {
    const allErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        allErrors.push(msg.text());
      }
    });

    page.on("pageerror", (error) => {
      allErrors.push(error.message);
    });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForTimeout(1000);

    expect(allErrors.filter((e) => !e.includes("ResizeObserver")).length).toBe(
      0
    );
  });
});
