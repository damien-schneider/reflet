import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";

export const AUTH_INITIAL_HEADING = "Authentication";
export const AUTH_SIGNUP_HEADING = "Create an account";
export const AUTH_SIGNIN_HEADING = "Welcome back";

export const DASHBOARD_ORG_SLUG_REGEX = /\/dashboard\/[^/]+$/;
const SELECT_ORGANIZATION_BUTTON_REGEX = /Select organization/i;

export const createTestEmail = (prefix: string) =>
  `${prefix}-${randomUUID()}@example.com`;

export const createTestName = (prefix: string) =>
  `${prefix} ${randomUUID().slice(0, 8)}`;

export const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function expectAuthForm(page: Page) {
  await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });
  await expect(page.locator("h1")).toContainText(AUTH_INITIAL_HEADING);
}

export async function signUpNewUser(
  page: Page,
  user: { email: string; password: string }
) {
  await page.getByTestId("email-input").fill(user.email);
  await page.getByTestId("email-input").blur();

  await expect(page.locator("h1")).toContainText(AUTH_SIGNUP_HEADING, {
    timeout: 10_000,
  });

  await page.getByTestId("password-input").fill(user.password);
  await page.getByTestId("confirm-password-input").fill(user.password);

  await page.getByRole("button", { name: "Create my account" }).click();
}

export async function createFirstOrganization(page: Page, name: string) {
  await expect(
    page.getByRole("heading", { name: "Welcome to Reflet" })
  ).toBeVisible({ timeout: 15_000 });

  const dialog = await openCreateOrganizationDialog(page);
  await dialog.getByLabel("Organization name").fill(name);
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog).not.toBeVisible({ timeout: 10_000 });
  await page.waitForURL(DASHBOARD_ORG_SLUG_REGEX, { timeout: 20_000 });
}

export async function openCreateOrganizationDialog(page: Page) {
  await page
    .getByRole("button", { name: SELECT_ORGANIZATION_BUTTON_REGEX })
    .first()
    .click();
  await page.getByText("Create organization").click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  return dialog;
}

export async function signUpNewUserWithOrg(
  page: Page,
  user: { email: string; password: string },
  organizationName: string
) {
  await signUpNewUser(page, user);
  await createFirstOrganization(page, organizationName);
}

export async function signInExistingUser(
  page: Page,
  user: { email: string; password: string }
) {
  await page.getByTestId("email-input").fill(user.email);
  await page.getByTestId("email-input").blur();

  await expect(page.locator("h1")).toContainText(AUTH_SIGNIN_HEADING, {
    timeout: 10_000,
  });

  await page.getByTestId("password-input").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}
