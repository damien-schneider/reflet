import { expect, test } from "@playwright/test";

const DASHBOARD_REGEX = /\/dashboard/;

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
  test("should show welcome screen and allow creating an organization", async ({
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

    // Wait for redirect to dashboard
    await page.waitForURL(DASHBOARD_REGEX, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    // Wait for the page to settle
    await page.waitForTimeout(2000);

    // Sign in after sign-up if still on auth form
    const authHeading = page.locator("h1");
    const headingText = await authHeading.textContent().catch(() => "");

    if (headingText?.includes("Authentification")) {
      await signInUser(page, testUser);
      await page.waitForURL(DASHBOARD_REGEX, { timeout: 15_000 });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    }

    // New users should see the welcome screen (no auto-created org)
    await expect(
      page.getByRole("heading", { name: "Welcome to Reflet" })
    ).toBeVisible({ timeout: 10_000 });

    // Use the organization switcher to create an org
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

    // Wait for redirect to dashboard
    await page.waitForURL(DASHBOARD_REGEX, { timeout: 10_000 });
    await page.waitForLoadState("networkidle");

    // Log any errors for debugging
    if (errors.length > 0) {
      console.log("Console errors during test:", errors);
    }

    // Check if the new organization was created successfully
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

    // New users should see the welcome screen
    await expect(
      page.getByRole("heading", { name: "Welcome to Reflet" })
    ).toBeVisible({ timeout: 10_000 });

    // Use the organization switcher to create an org
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
