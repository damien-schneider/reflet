import { expect, test } from "@playwright/test";
import {
  AUTH_INITIAL_HEADING,
  createOrganization,
  DASHBOARD_REGEX,
  makeOrgName,
  makeTestUser,
  openUserMenu,
  signInUser,
  signUpAndLandOnDashboard,
  signUpNewUser,
} from "./helpers/auth";

const ORG_DASHBOARD_REGEX = /\/dashboard\/[^/]+$/;

test.describe("Core Authentication Flows", () => {
  test("lands a new user on the welcome screen after sign up", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });
    await expect(page.locator("h1")).toContainText(AUTH_INITIAL_HEADING);

    await signUpNewUser(page, makeTestUser("signup"));

    await expect(page).toHaveURL(DASHBOARD_REGEX, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Welcome to Reflet" })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("returns a signed-out user to their organization after sign in", async ({
    page,
  }) => {
    const user = makeTestUser("signin");
    await signUpAndLandOnDashboard(page, user);
    const slug = await createOrganization(page, makeOrgName("Sign In Org"));

    await page.context().clearCookies();
    await page.goto("/dashboard");
    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });

    await signInUser(page, user);

    await expect(page).toHaveURL(ORG_DASHBOARD_REGEX, { timeout: 15_000 });
    expect(page.url()).toContain(slug);
  });

  test("clears the session and returns home after sign out", async ({
    page,
  }) => {
    const user = makeTestUser("signout");
    await signUpAndLandOnDashboard(page, user);

    await openUserMenu(page, user);
    const signOutButton = page.getByText("Sign out");
    await expect(signOutButton).toBeVisible({ timeout: 10_000 });
    await signOutButton.click();

    await page.waitForURL("http://localhost:3003/", { timeout: 15_000 });
    await expect(page.getByText(user.email)).toBeHidden();
  });
});

test.describe("Protected Routes", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("redirects to the auth form when the dashboard is opened signed out", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

    await expect(page.locator("h1")).toContainText(AUTH_INITIAL_HEADING);
  });
});

test.describe("UI Components - No Console Errors", () => {
  test("raises no MenuGroupRootContext error on the dashboard", async ({
    page,
  }) => {
    const errors: string[] = [];
    const record = (text: string) => {
      if (text.includes("MenuGroupRootContext")) {
        errors.push(text);
      }
    };

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        record(msg.text());
      }
    });
    page.on("pageerror", (error) => record(error.message));

    await signUpAndLandOnDashboard(page, makeTestUser("console"));
    await createOrganization(page, makeOrgName("Console Org"));

    expect(errors).toEqual([]);
  });

  test("raises no console error on the marketing home page", async ({
    page,
  }) => {
    const allErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        allErrors.push(msg.text());
      }
    });
    page.on("pageerror", (error) => allErrors.push(error.message));

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

    expect(allErrors.filter((e) => !e.includes("ResizeObserver"))).toEqual([]);
  });
});
