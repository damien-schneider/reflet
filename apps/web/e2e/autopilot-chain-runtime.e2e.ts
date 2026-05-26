import { expect, test } from "@playwright/test";
import {
  createTestEmail,
  createTestName,
  DASHBOARD_ORG_SLUG_REGEX,
  signUpNewUserWithOrg,
} from "./helpers/auth";

const ORG_SLUG_FROM_URL = /\/dashboard\/([^/]+)/;
const AI_PROVIDER_REQUEST = /openrouter|api\.openai/i;
const REPO_ANALYSIS_TEXT = /repo analysis/i;

test.use({ viewport: { width: 1440, height: 1000 } });

test.describe("Autopilot chain runtime", () => {
  test("shows role-skill runtime and no employee-agent grid when repo analysis is missing", async ({
    page,
  }) => {
    await page.route(AI_PROVIDER_REQUEST, (route) => route.abort());
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("cookie-consent", "rejected");
      } catch (error) {
        if (error instanceof DOMException) {
          return;
        }
        throw error;
      }
    });

    const user = {
      email: createTestEmail("autopilot-chain-runtime"),
      password: "password123",
    };
    const orgName = createTestName("Runtime Chain Org");

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });

    await signUpNewUserWithOrg(page, user, orgName);
    await page.waitForURL(DASHBOARD_ORG_SLUG_REGEX, { timeout: 20_000 });

    const orgSlug = page.url().match(ORG_SLUG_FROM_URL)?.[1];
    expect(orgSlug, `Expected org slug in ${page.url()}`).toBeTruthy();

    await page.goto(`/dashboard/${orgSlug}/autopilot/chain`);
    await page.waitForLoadState("networkidle", { timeout: 15_000 });

    await expect(
      page.getByRole("heading", { name: "Runtime chain" })
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("CTO skill", { exact: true })).toBeVisible();
    await expect(page.getByText("PM skill", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Validator skill", { exact: true })
    ).toBeVisible();
    await expect(page.getByText(REPO_ANALYSIS_TEXT)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Agents" })).toHaveCount(0);
  });
});
