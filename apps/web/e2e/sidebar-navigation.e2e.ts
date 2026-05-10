import { expect, test } from "@playwright/test";
import {
  createTestEmail,
  createTestName,
  signUpNewUserWithOrg,
} from "./helpers/auth";

const DASHBOARD_URL_PATTERN = /\/dashboard\/[^/]+$/;
const PROJECT_URL_PATTERN = /\/dashboard\/[^/]+\/project(\/.*)?$/;
const FEEDBACK_LINK_REGEX = /Feedback/i;
const PROJECT_LINK_REGEX = /Project/i;

test.describe("Sidebar Navigation - Feedback and Project", () => {
  test("should navigate to Feedback page without 404 error", async ({
    page,
  }) => {
    const testUser = {
      email: createTestEmail("nav-test"),
      password: "password123",
    };
    const orgName = createTestName("Nav Org");

    // Track 404 responses
    const responses404: string[] = [];
    page.on("response", (response) => {
      if (response.status() === 404) {
        responses404.push(response.url());
      }
    });

    // 1. Sign up to get to the dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

    await signUpNewUserWithOrg(page, testUser, orgName);

    // Wait for the dashboard to load
    await page.waitForURL(DASHBOARD_URL_PATTERN, { timeout: 20_000 });
    await page.waitForLoadState("networkidle");

    const feedbackLink = page.getByRole("link", {
      name: FEEDBACK_LINK_REGEX,
    });
    await expect(feedbackLink).toBeVisible({ timeout: 10_000 });
    await feedbackLink.click();

    await expect(page).toHaveURL(DASHBOARD_URL_PATTERN, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    const dashboard404 = responses404.filter((url) =>
      url.includes("/dashboard")
    );
    expect(dashboard404.length).toBe(0);

    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("should navigate to Project page without 404 error", async ({
    page,
  }) => {
    const testUser = {
      email: createTestEmail("nav-test-settings"),
      password: "password123",
    };
    const orgName = createTestName("Settings Org");

    // Track 404 responses
    const responses404: string[] = [];
    page.on("response", (response) => {
      if (response.status() === 404) {
        responses404.push(response.url());
      }
    });

    // 1. Sign up to get to the dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

    await signUpNewUserWithOrg(page, testUser, orgName);

    // Wait for the dashboard to load
    await page.waitForURL(DASHBOARD_URL_PATTERN, { timeout: 20_000 });
    await page.waitForLoadState("networkidle");

    const projectLink = page.getByRole("link", { name: PROJECT_LINK_REGEX });
    await expect(projectLink).toBeVisible({ timeout: 10_000 });
    await projectLink.click();

    await expect(page).toHaveURL(PROJECT_URL_PATTERN, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    const project404 = responses404.filter((url) => url.includes("/project"));
    expect(project404.length).toBe(0);

    await expect(
      page.getByRole("link", { name: "Project" }).first()
    ).toBeVisible({
      timeout: 10_000,
    });
  });
});
