import { expect, test } from "@playwright/test";
import {
  createTestEmail,
  createTestName,
  signUpNewUserWithOrg,
} from "./helpers/auth";

const DASHBOARD_URL_PATTERN = /\/dashboard\/[^/]+$/;
const ORG_SLUG_PATTERN = /\/dashboard\/([^/]+)$/;
const PROJECT_GITHUB_URL_PATTERN = /\/dashboard\/[^/]+\/project\/github$/;

test.describe("Full Navigation E2E - No 404 Errors", () => {
  test("should navigate through all dashboard pages without 404", async ({
    page,
  }) => {
    const testUser = {
      email: createTestEmail("fullnav"),
      password: "password123",
    };
    const orgName = createTestName("Full Nav Org");

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

    // Get org slug from URL
    const dashboardUrl = page.url();
    const orgSlugMatch = dashboardUrl.match(ORG_SLUG_PATTERN);
    expect(orgSlugMatch).toBeTruthy();
    const orgSlug = orgSlugMatch?.[1] ?? "";

    await page.goto(`/dashboard/${orgSlug}`);
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", {
        name: "Feature Requests & Feedback",
        exact: true,
      })
    ).toBeVisible({ timeout: 10_000 });

    await page.goto(`/dashboard/${orgSlug}/project`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(PROJECT_GITHUB_URL_PATTERN, {
      timeout: 10_000,
    });
    await expect(page.getByText("GitHub Connection")).toBeVisible({
      timeout: 10_000,
    });

    await page.goto(`/dashboard/${orgSlug}/tasks`);
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", { name: "Tasks", exact: true })
    ).toBeVisible({ timeout: 10_000 });

    await page.goto(`/dashboard/${orgSlug}/changelog`);
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", { name: "Changelog", exact: true })
    ).toBeVisible({ timeout: 10_000 });

    await page.goto(`/dashboard/${orgSlug}/project/members`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Team Members")).toBeVisible({
      timeout: 10_000,
    });

    // Check no 404 HTTP responses for any dashboard pages
    const dashboard404 = responses404.filter((url) =>
      url.includes("/dashboard")
    );
    expect(
      dashboard404.length,
      `Found 404 responses: ${dashboard404.join(", ")}`
    ).toBe(0);
  });

  test("should navigate public pages without 404", async ({ page }) => {
    const testUser = {
      email: createTestEmail("publicnav"),
      password: "password123",
    };
    const orgName = createTestName("Public Nav Org");

    // Track 404 responses
    const responses404: string[] = [];
    page.on("response", (response) => {
      if (response.status() === 404) {
        responses404.push(response.url());
      }
    });

    // 1. Sign up to get to the dashboard and get the org slug
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

    await signUpNewUserWithOrg(page, testUser, orgName);

    // Wait for the dashboard to load
    await page.waitForURL(DASHBOARD_URL_PATTERN, { timeout: 20_000 });
    await page.waitForLoadState("networkidle");

    // Get org slug from URL
    const dashboardUrl = page.url();
    const orgSlugMatch = dashboardUrl.match(ORG_SLUG_PATTERN);
    expect(orgSlugMatch).toBeTruthy();
    const orgSlug = orgSlugMatch?.[1] ?? "";

    // 2. Navigate to public organization page
    await page.goto(`/${orgSlug}`);
    await page.waitForLoadState("networkidle");
    // URL should end with the org slug
    expect(page.url()).toContain(`/${orgSlug}`);

    // 3. Navigate to public changelog page
    await page.goto(`/${orgSlug}/changelog`);
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain(`/${orgSlug}/changelog`);

    // 4. Navigate to public roadmap page
    await page.goto(`/${orgSlug}/roadmap`);
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain(`/${orgSlug}/roadmap`);

    // Check no 404 HTTP responses for public pages
    const public404 = responses404.filter(
      (url) =>
        url.includes(`/${orgSlug}`) &&
        !url.includes("/api/") &&
        !url.includes("/_next/")
    );
    expect(
      public404.length,
      `Found 404 responses: ${public404.join(", ")}`
    ).toBe(0);
  });
});
