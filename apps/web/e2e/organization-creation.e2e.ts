import { expect, test } from "@playwright/test";

const DASHBOARD_ORG_SLUG_REGEX = /\/dashboard\/[^/]+$/;
const DASHBOARD_REGEX = /\/dashboard/;
const ORG_NAME_REGEX = /Mon Organisation|Select organization/;

// Auth form headings (French UI)
const AUTH_SIGNUP_HEADING = "Créer un compte";

// Auth form headings (French UI)
const AUTH_SIGNIN_HEADING = "Bon retour parmi nous";

/**
 * Helper to complete sign-up flow with the new unified auth form
 */
async function signUpNewUser(
  page: import("@playwright/test").Page,
  user: { email: string; password: string }
) {
  await page.getByTestId("email-input").fill(user.email);
  await page.getByTestId("email-input").blur();

  await expect(page.locator("h1")).toContainText(AUTH_SIGNUP_HEADING, {
    timeout: 10_000,
  });

  await page.getByTestId("password-input").fill(user.password);
  await page.getByTestId("confirm-password-input").fill(user.password);

  await page.getByRole("button", { name: "Créer mon compte" }).click();
}

/**
 * Helper to sign in an existing user
 */
async function signInUser(
  page: import("@playwright/test").Page,
  user: { email: string; password: string }
) {
  await page.getByTestId("email-input").fill(user.email);
  await page.getByTestId("email-input").blur();

  await expect(page.locator("h1")).toContainText(AUTH_SIGNIN_HEADING, {
    timeout: 10_000,
  });

  await page.getByTestId("password-input").fill(user.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

test.describe("Organization Creation", () => {
  test("should create a new organization via the organization switcher", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testUser = {
      email: `org-create-${timestamp}@example.com`,
      password: "password123",
    };
    const newOrgName = `Test Org ${timestamp}`;

    // Track console errors to help debug silent failures
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    // Sign up first
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });

    await signUpNewUser(page, testUser);

    // Wait for redirect to dashboard (sign-up redirects to /dashboard but user may not be authenticated)
    await page.waitForURL(DASHBOARD_REGEX, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    // Wait for the page to settle and check what's displayed
    await page.waitForTimeout(2000);

    // Sign in after sign-up (Better-Auth may not auto-authenticate when email verification is skipped)
    // Check if we're still on the auth form by looking for the h1
    const authHeading = page.locator("h1");
    const headingText = await authHeading.textContent().catch(() => "");

    if (headingText?.includes("Authentification")) {
      console.log(
        "DEBUG: Still on auth form after sign-up, signing in explicitly"
      );
      await signInUser(page, testUser);
      await page.waitForURL(DASHBOARD_REGEX, { timeout: 15_000 });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    }

    // Wait for auto-redirect to org (personal org is created automatically)
    await expect(page).toHaveURL(DASHBOARD_ORG_SLUG_REGEX, { timeout: 30_000 });

    // Open the organization switcher dropdown
    const orgSwitcherButton = page
      .getByRole("button")
      .filter({ hasText: ORG_NAME_REGEX })
      .first();
    await expect(orgSwitcherButton).toBeVisible({ timeout: 10_000 });
    await orgSwitcherButton.click();

    // Wait for dropdown to animate open
    await page.waitForTimeout(500);

    // Look for the dropdown content - it should contain "Create organization"
    const createOrgOption = page.getByText("Create organization");
    await expect(createOrgOption).toBeVisible({ timeout: 5000 });
    await createOrgOption.click();

    // Wait for the create organization dialog
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(
      dialog.getByRole("heading", { name: "Create organization" })
    ).toBeVisible();

    // Fill in the organization name
    const nameInput = dialog.locator("#name");
    await expect(nameInput).toBeVisible();
    await nameInput.fill(newOrgName);

    // Click Create button
    const createButton = dialog.getByRole("button", { name: "Create" });
    await expect(createButton).toBeEnabled();
    await createButton.click();

    // Wait for dialog to close
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    // Wait for redirect to /dashboard (the success redirect)
    await page.waitForURL(DASHBOARD_REGEX, { timeout: 10_000 });
    await page.waitForLoadState("networkidle");

    // Wait a bit more for Convex to sync the new org to the query
    await page.waitForTimeout(3000);

    // Open the org switcher again to verify the new org exists
    // Re-query the button since page may have refreshed
    const orgSwitcherAfterCreate = page
      .getByRole("button")
      .filter({ hasText: ORG_NAME_REGEX })
      .first();
    await expect(orgSwitcherAfterCreate).toBeVisible({ timeout: 10_000 });
    await orgSwitcherAfterCreate.click();
    await page.waitForTimeout(500);

    // Verify the new organization appears in the dropdown list
    const newOrgInList = page.getByText(newOrgName).first();
    await expect(newOrgInList).toBeVisible({ timeout: 5000 });

    // Log any errors for debugging
    if (errors.length > 0) {
      console.log("Console errors during test:", errors);
    }

    // Check if the new organization was created successfully
    // If there are errors, the test should fail with details
    expect(
      errors.filter((e) => e.includes("Error") || e.includes("error"))
    ).toHaveLength(0);
  });

  test("should show error feedback when organization creation fails", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testUser = {
      email: `org-error-${timestamp}@example.com`,
      password: "password123",
    };

    // Track errors
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    // Sign up first
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });

    await signUpNewUser(page, testUser);

    // Wait for redirect to dashboard
    await page.waitForURL(DASHBOARD_REGEX, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    // Sign in after sign-up if still on auth form
    const isOnAuthForm = await page
      .locator("h1")
      .filter({ hasText: "Authentification" })
      .isVisible()
      .catch(() => false);

    if (isOnAuthForm) {
      await signInUser(page, testUser);
      await page.waitForURL(DASHBOARD_REGEX, { timeout: 15_000 });
      await page.waitForLoadState("networkidle");
    }

    // Wait for auto-redirect to org (personal org is created automatically)
    await expect(page).toHaveURL(DASHBOARD_ORG_SLUG_REGEX, { timeout: 30_000 });

    // Open the organization switcher dropdown
    const orgSwitcherButton = page.getByRole("button", {
      name: ORG_NAME_REGEX,
    });
    await expect(orgSwitcherButton).toBeVisible({ timeout: 10_000 });
    await orgSwitcherButton.click();

    // Click "Create organization" option
    const createOrgOption = page.getByText("Create organization");
    await expect(createOrgOption).toBeVisible({ timeout: 5000 });
    await createOrgOption.click();

    // Wait for dialog
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Try to create with empty name (should be blocked by UI)
    const createButton = dialog.getByRole("button", { name: "Create" });
    await createButton.click();

    // Dialog should still be open (creation should not proceed with empty name)
    await expect(dialog).toBeVisible();

    // Close dialog
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });
});
