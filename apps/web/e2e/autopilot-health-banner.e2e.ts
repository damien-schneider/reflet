import { expect, test } from "@playwright/test";
import {
  createTestEmail,
  createTestName,
  DASHBOARD_ORG_SLUG_REGEX,
  signUpNewUserWithOrg,
} from "./helpers/auth";

const ORG_SLUG_FROM_URL = /\/dashboard\/([^/]+)/;
const BANNER_HEADING = /Action required|System issues detected/;
const BLOCKER_BODY = /not configured|GitHub repository|repository analysis/i;

test.describe("Autopilot Health Banner", () => {
  test("surfaces a critical blocker with a Configure CTA when autopilot is unconfigured", async ({
    page,
  }) => {
    const testUser = {
      email: createTestEmail("autopilot-health"),
      password: "password123",
    };
    const orgName = createTestName("Health Banner Org");

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });

    await signUpNewUserWithOrg(page, testUser, orgName);
    await page.waitForURL(DASHBOARD_ORG_SLUG_REGEX, { timeout: 20_000 });

    const orgUrlMatch = page.url().match(ORG_SLUG_FROM_URL);
    const orgSlug = orgUrlMatch?.[1];
    expect(orgSlug).toBeTruthy();

    await page.goto(`/dashboard/${orgSlug}/autopilot`);
    await page.waitForLoadState("networkidle", { timeout: 15_000 });

    const banner = page.getByText(BANNER_HEADING);
    await expect(banner).toBeVisible({ timeout: 15_000 });

    const blocker = page.locator("p").filter({ hasText: BLOCKER_BODY }).first();
    await expect(blocker).toBeVisible({ timeout: 10_000 });
  });
});
