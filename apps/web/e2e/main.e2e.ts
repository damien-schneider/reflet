import { expect, test } from "@playwright/test";
import {
  createTestEmail,
  createTestName,
  DASHBOARD_ORG_SLUG_REGEX,
  escapeRegex,
  expectAuthForm,
  signInExistingUser,
  signUpNewUserWithOrg,
} from "./helpers/auth";

test.describe("Core Authentication Flows", () => {
  test("should allow sign up and redirect to dashboard", async ({ page }) => {
    const testUser = {
      email: createTestEmail("signup"),
      password: "password123",
    };
    const orgName = createTestName("Signup Org");

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

    await expectAuthForm(page);

    await signUpNewUserWithOrg(page, testUser, orgName);

    await expect(page).toHaveURL(DASHBOARD_ORG_SLUG_REGEX, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("should allow sign in and redirect to dashboard", async ({ page }) => {
    const testUser = {
      email: createTestEmail("signin"),
      password: "password123",
    };
    const orgName = createTestName("Signin Org");

    // First sign up
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });

    await signUpNewUserWithOrg(page, testUser, orgName);

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
    const testUser = {
      email: createTestEmail("signout"),
      password: "password123",
    };
    const orgName = createTestName("Signout Org");

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });

    await signUpNewUserWithOrg(page, testUser, orgName);

    await page.waitForURL(DASHBOARD_ORG_SLUG_REGEX, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    // Find the user menu button in the sidebar footer (the collapsible trigger)
    // It contains the user's name and email
    const userButton = page.getByRole("button", {
      name: new RegExp(escapeRegex(testUser.email)),
    });
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

    await expectAuthForm(page);
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

    await expectAuthForm(page);
  });
});

test.describe("UI Components - No Console Errors", () => {
  test("should not have MenuGroupRootContext errors on dashboard", async ({
    page,
  }) => {
    const testUser = {
      email: createTestEmail("console"),
      password: "password123",
    };
    const orgName = createTestName("Console Org");

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

    await signUpNewUserWithOrg(page, testUser, orgName);

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
