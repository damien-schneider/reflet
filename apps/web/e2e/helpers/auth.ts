import { expect, type Page } from "@playwright/test";

export const AUTH_INITIAL_HEADING = "Authentication";
export const AUTH_SIGNUP_HEADING = "Create an account";
export const AUTH_SIGNIN_HEADING = "Welcome back";
export const DASHBOARD_REGEX = /\/dashboard/;
const ORG_DASHBOARD_REGEX = /\/dashboard\/[^/]+/;

export interface TestUser {
  email: string;
  password: string;
}

export function makeTestUser(prefix: string): TestUser {
  return {
    email: `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`,
    password: "password123",
  };
}

export async function signUpNewUser(page: Page, user: TestUser) {
  await page.getByTestId("email-input").fill(user.email);
  await page.getByTestId("email-input").blur();

  await expect(page.locator("h1")).toContainText(AUTH_SIGNUP_HEADING, {
    timeout: 10_000,
  });

  await page.getByTestId("password-input").fill(user.password);
  await page.getByTestId("confirm-password-input").fill(user.password);
  await page.getByRole("button", { name: "Create my account" }).click();
}

export async function signInUser(page: Page, user: TestUser) {
  await page.getByTestId("email-input").fill(user.email);
  await page.getByTestId("email-input").blur();

  await expect(page.locator("h1")).toContainText(AUTH_SIGNIN_HEADING, {
    timeout: 10_000,
  });

  await page.getByTestId("password-input").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

// sign-up sometimes lands back on the auth form instead of an active session
export async function signUpAndLandOnDashboard(page: Page, user: TestUser) {
  await page.goto("/dashboard");
  await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
  await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });

  await signUpNewUser(page, user);
  await page.waitForURL(DASHBOARD_REGEX, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");

  const isBackOnAuthForm = await page
    .locator("h1")
    .filter({ hasText: AUTH_INITIAL_HEADING })
    .isVisible()
    .catch(() => false);

  if (isBackOnAuthForm) {
    await signInUser(page, user);
    await page.waitForURL(DASHBOARD_REGEX, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");
  }
}

export async function createOrganization(page: Page, name: string) {
  await expect(
    page.getByRole("heading", { name: "Welcome to Reflet" })
  ).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "Select organization" }).click();
  await page.getByText("Create organization").click();

  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await dialog.locator("#name").fill(name);
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog).not.toBeVisible({ timeout: 15_000 });

  await page.waitForURL(ORG_DASHBOARD_REGEX, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");

  const slug = new URL(page.url()).pathname.split("/")[2];
  if (!slug) {
    throw new Error(`Could not read org slug from ${page.url()}`);
  }
  return slug;
}

export async function openUserMenu(page: Page, user: TestUser) {
  const trigger = page.getByRole("button").filter({ hasText: user.email });
  await expect(trigger).toBeVisible({ timeout: 15_000 });
  await trigger.click();
}

export function makeOrgName(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}
