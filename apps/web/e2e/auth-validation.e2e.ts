import { expect, test } from "@playwright/test";

// Auth form headings (French UI)
const AUTH_INITIAL_HEADING = "Authentification";
const AUTH_SIGNUP_HEADING = "Créer un compte";

test.describe("Auth Form Password Validation", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("should show error when passwords do not match during sign-up", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testEmail = `password-mismatch-${timestamp}@example.com`;

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });
    await expect(page.locator("h1")).toContainText(AUTH_INITIAL_HEADING);

    // Enter email and blur to trigger email check
    await page.getByTestId("email-input").fill(testEmail);
    await page.getByTestId("email-input").blur();

    // Wait for sign-up mode (new user)
    await expect(page.locator("h1")).toContainText(AUTH_SIGNUP_HEADING, {
      timeout: 10_000,
    });

    // Fill password fields with different values
    await page.getByTestId("password-input").fill("password123");
    await page.getByTestId("confirm-password-input").fill("differentpassword");

    // Blur to trigger validation
    await page.getByTestId("confirm-password-input").blur();

    // Check for password mismatch error
    await expect(
      page.getByText("Les mots de passe ne correspondent pas")
    ).toBeVisible({ timeout: 5000 });

    // Submit button should be disabled
    await expect(page.getByTestId("submit-button")).toBeDisabled();
  });

  test("should not show error when passwords match during sign-up", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testEmail = `password-match-${timestamp}@example.com`;

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });
    await expect(page.locator("h1")).toContainText(AUTH_INITIAL_HEADING);

    // Enter email and blur to trigger email check
    await page.getByTestId("email-input").fill(testEmail);
    await page.getByTestId("email-input").blur();

    // Wait for sign-up mode (new user)
    await expect(page.locator("h1")).toContainText(AUTH_SIGNUP_HEADING, {
      timeout: 10_000,
    });

    // Fill password fields with same values
    await page.getByTestId("password-input").fill("password123");
    await page.getByTestId("confirm-password-input").fill("password123");

    // Blur to trigger validation
    await page.getByTestId("confirm-password-input").blur();

    // Wait a bit for validation to settle
    await page.waitForTimeout(500);

    // Should NOT show password mismatch error
    await expect(
      page.getByText("Les mots de passe ne correspondent pas")
    ).not.toBeVisible();

    // Submit button should be enabled
    await expect(page.getByTestId("submit-button")).not.toBeDisabled();
  });

  test("should disable submit button when passwords do not match", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testEmail = `button-disabled-${timestamp}@example.com`;

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });

    // Enter email and blur to trigger email check
    await page.getByTestId("email-input").fill(testEmail);
    await page.getByTestId("email-input").blur();

    // Wait for sign-up mode
    await expect(page.locator("h1")).toContainText(AUTH_SIGNUP_HEADING, {
      timeout: 10_000,
    });

    // Fill password with valid length
    await page.getByTestId("password-input").fill("password123");

    // Fill confirm password with different value
    await page.getByTestId("confirm-password-input").fill("password456");

    // Submit button should be disabled
    await expect(page.getByTestId("submit-button")).toBeDisabled();
  });

  test("should enable submit button when passwords match", async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `button-enabled-${timestamp}@example.com`;

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });

    // Enter email and blur to trigger email check
    await page.getByTestId("email-input").fill(testEmail);
    await page.getByTestId("email-input").blur();

    // Wait for sign-up mode
    await expect(page.locator("h1")).toContainText(AUTH_SIGNUP_HEADING, {
      timeout: 10_000,
    });

    // Fill password fields with matching values
    await page.getByTestId("password-input").fill("password123");
    await page.getByTestId("confirm-password-input").fill("password123");

    // Wait a bit for validation
    await page.waitForTimeout(500);

    // Submit button should be enabled
    await expect(page.getByTestId("submit-button")).not.toBeDisabled();
  });

  test("should revalidate when password field changes after initial match", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testEmail = `revalidate-${timestamp}@example.com`;

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });

    // Enter email and blur to trigger email check
    await page.getByTestId("email-input").fill(testEmail);
    await page.getByTestId("email-input").blur();

    // Wait for sign-up mode
    await expect(page.locator("h1")).toContainText(AUTH_SIGNUP_HEADING, {
      timeout: 10_000,
    });

    // Fill matching passwords first
    await page.getByTestId("password-input").fill("password123");
    await page.getByTestId("confirm-password-input").fill("password123");

    // Wait a bit for validation
    await page.waitForTimeout(500);

    // Should NOT show error initially
    await expect(
      page.getByText("Les mots de passe ne correspondent pas")
    ).not.toBeVisible();

    // Now change the password field
    await page.getByTestId("password-input").fill("newpassword456");

    // Should now show mismatch error
    await expect(
      page.getByText("Les mots de passe ne correspondent pas")
    ).toBeVisible({ timeout: 5000 });

    // Submit button should be disabled
    await expect(page.getByTestId("submit-button")).toBeDisabled();
  });

  test("should always show validation error explaining why submit button is disabled", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testEmail = `error-explanation-${timestamp}@example.com`;

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });

    // Enter email and blur to trigger email check
    await page.getByTestId("email-input").fill(testEmail);
    await page.getByTestId("email-input").blur();

    // Wait for sign-up mode
    await expect(page.locator("h1")).toContainText(AUTH_SIGNUP_HEADING, {
      timeout: 10_000,
    });

    // Fill password fields with different values immediately (no blur between)
    await page.getByTestId("password-input").fill("password123");
    await page.getByTestId("confirm-password-input").fill("differentpassword");

    // Submit button should be disabled
    await expect(page.getByTestId("submit-button")).toBeDisabled();

    // CRITICAL: When button is disabled due to password mismatch,
    // user MUST see an error message explaining why
    // This test ensures the user is never stuck without explanation
    await expect(
      page.getByText("Les mots de passe ne correspondent pas")
    ).toBeVisible({ timeout: 5000 });
  });
});
