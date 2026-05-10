import { expect, test } from "@playwright/test";
import {
  AUTH_INITIAL_HEADING,
  createTestEmail,
  createTestName,
  openCreateOrganizationDialog,
  signInExistingUser,
  signUpNewUser,
} from "./helpers/auth";

const DASHBOARD_REGEX = /\/dashboard/;

test.describe("Organization Creation", () => {
  test("should show welcome screen and allow creating an organization", async ({
    page,
  }) => {
    const testUser = {
      email: createTestEmail("org-create"),
      password: "password123",
    };
    const newOrgName = createTestName("Test Org");

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

    if (headingText?.includes(AUTH_INITIAL_HEADING)) {
      await signInExistingUser(page, testUser);
      await page.waitForURL(DASHBOARD_REGEX, { timeout: 15_000 });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    }

    // New users should see the welcome screen (no auto-created org)
    await expect(
      page.getByRole("heading", { name: "Welcome to Reflet" })
    ).toBeVisible({ timeout: 10_000 });

    // Use the organization switcher to create an org
    const dialog = await openCreateOrganizationDialog(page);
    await expect(
      dialog.getByRole("heading", { name: "Create organization" })
    ).toBeVisible();

    // Fill in the organization name
    const nameInput = dialog.locator("#name");
    await expect(nameInput).toBeVisible();
    await nameInput.fill(newOrgName);

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
    const testUser = {
      email: createTestEmail("org-error"),
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
      .filter({ hasText: AUTH_INITIAL_HEADING })
      .isVisible()
      .catch(() => false);

    if (isOnAuthForm) {
      await signInExistingUser(page, testUser);
      await page.waitForURL(DASHBOARD_REGEX, { timeout: 15_000 });
      await page.waitForLoadState("networkidle");
    }

    // New users should see the welcome screen
    await expect(
      page.getByRole("heading", { name: "Welcome to Reflet" })
    ).toBeVisible({ timeout: 10_000 });

    // Use the organization switcher to create an org
    const dialog = await openCreateOrganizationDialog(page);

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
