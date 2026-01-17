import { expect, test } from "@playwright/test";

const DASHBOARD_ORG_SLUG_REGEX = /\/dashboard\/[^/]+$/;

const TEST_USER = {
  name: `Test User ${Date.now()}`,
  email: `test-${Date.now()}@example.com`,
  password: "password123",
};

test.describe("Core Authentication Flows", () => {
  test("should allow sign up and redirect to dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });
    await expect(page.locator("h1")).toContainText("Create Account");

    await page.getByTestId("name-input").fill(TEST_USER.name);
    await page.getByTestId("email-input").fill(TEST_USER.email);
    await page.getByTestId("password-input").fill(TEST_USER.password);

    await page.getByRole("button", { name: "Sign Up" }).click();

    await expect(page).toHaveURL(DASHBOARD_ORG_SLUG_REGEX, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    await expect(page.locator("aside")).toBeVisible();
  });

  test("should allow sign in and redirect to dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });
    await page.getByTestId("name-input").fill(TEST_USER.name);
    await page.getByTestId("email-input").fill(TEST_USER.email);
    await page.getByTestId("password-input").fill(TEST_USER.password);

    await page.getByRole("button", { name: "Sign Up" }).click();

    await page.waitForURL(DASHBOARD_ORG_SLUG_REGEX, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("email-input").fill(TEST_USER.email);
    await page.getByTestId("password-input").fill(TEST_USER.password);

    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL(DASHBOARD_ORG_SLUG_REGEX, { timeout: 15_000 });
  });

  test("should allow sign out and redirect to sign in", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });
    await page.getByTestId("name-input").fill(TEST_USER.name);
    await page.getByTestId("email-input").fill(TEST_USER.email);
    await page.getByTestId("password-input").fill(TEST_USER.password);

    await page.getByRole("button", { name: "Sign Up" }).click();

    await page.waitForURL(DASHBOARD_ORG_SLUG_REGEX, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    await page.evaluate(() => {
      const userMenu = document.querySelector('button[aria-haspopup="menu"]');
      if (userMenu) {
        (userMenu as HTMLButtonElement).click();
      }
    });

    await page.waitForTimeout(500);

    await page.evaluate(() => {
      const signOutButton = Array.from(
        document.querySelectorAll('[role="menuitem"]')
      ).find((el) => el.textContent === "Sign out");
      if (signOutButton) {
        (signOutButton as HTMLElement).click();
      }
    });

    await page.waitForTimeout(1000);

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

    await expect(page.locator("h1")).toContainText("Create Account");
  });
});

test.describe("Protected Routes", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("should redirect to sign in when accessing dashboard without auth", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

    await expect(page.locator("h1")).toContainText("Create Account");
  });

  test("should redirect to sign in when accessing boards route without auth", async ({
    page,
  }) => {
    await page.goto("/dashboard/my-org/boards");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

    await expect(page.locator("h1")).toContainText("Create Account");
  });

  test("should redirect to sign in when accessing settings route without auth", async ({
    page,
  }) => {
    await page.goto("/dashboard/my-org/settings");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

    await expect(page.locator("h1")).toContainText("Create Account");
  });

  test("should redirect to sign in when accessing specific board without auth", async ({
    page,
  }) => {
    await page.goto("/dashboard/my-organization/boards/test");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

    await expect(page.locator("h1")).toContainText("Create Account");
  });
});

test.describe("UI Components - No Console Errors", () => {
  test("should not have MenuGroupRootContext errors on dashboard", async ({
    page,
  }) => {
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

    await page.getByTestId("name-input").fill(TEST_USER.name);
    await page.getByTestId("email-input").fill(TEST_USER.email);
    await page.getByTestId("password-input").fill(TEST_USER.password);

    await page.getByRole("button", { name: "Sign Up" }).click();

    await page.waitForURL(DASHBOARD_ORG_SLUG_REGEX, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    await page.waitForTimeout(2000);

    console.log("Captured MenuGroupRootContext errors:", errors);
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

    console.log("All console errors captured:", allErrors);
    expect(allErrors.filter((e) => !e.includes("ResizeObserver")).length).toBe(
      0
    );
  });
});
