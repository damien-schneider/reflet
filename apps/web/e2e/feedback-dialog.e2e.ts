import { expect, type Page, test } from "@playwright/test";
import {
  createTestEmail,
  createTestName,
  DASHBOARD_ORG_SLUG_REGEX,
  expectAuthForm,
  signUpNewUserWithOrg,
} from "./helpers/auth";

const DASHBOARD_SLUG_EXTRACT_REGEX = /\/dashboard\/([^/]+)/;
const FEEDBACK_SORT_BUTTON_REGEX = /Most Votes|Newest|Oldest/i;
const MOST_VOTES_BUTTON_REGEX = /Most Votes/i;
const NEWEST_BUTTON_REGEX = /Newest/i;
const SHARE_FEEDBACK_BUTTON_REGEX = /Share an idea or suggestion/i;

const extractDashboardOrgSlug = (url: string) => {
  const match = url.match(DASHBOARD_SLUG_EXTRACT_REGEX);
  expect(
    match?.[1],
    `Expected dashboard organization slug in ${url}`
  ).toBeTruthy();
  return match?.[1] ?? "";
};

async function signUpAndOpenFeedbackBoard(page: Page) {
  const testUser = {
    email: createTestEmail("feedback-board"),
    password: "password123",
  };
  const orgName = createTestName("Feedback Org");

  await page.goto("/dashboard");
  await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
  await expectAuthForm(page);

  await signUpNewUserWithOrg(page, testUser, orgName);

  await expect(page).toHaveURL(DASHBOARD_ORG_SLUG_REGEX, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");

  const orgSlug = extractDashboardOrgSlug(page.url());

  await page.goto(`/${orgSlug}`);
  await page.waitForLoadState("networkidle");

  return orgSlug;
}

test.describe("Public Feedback Board", () => {
  test("renders member feedback board controls without creating AI-backed data", async ({
    page,
  }) => {
    await signUpAndOpenFeedbackBoard(page);

    await expect(
      page.getByRole("heading", {
        name: "Feature Requests & Feedback",
        exact: true,
      })
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByPlaceholder("Search...")).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByRole("button", { name: FEEDBACK_SORT_BUTTON_REGEX })
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: SHARE_FEEDBACK_BUTTON_REGEX })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("filters the empty board without navigation or console errors", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => {
      consoleErrors.push(error.message);
    });

    await signUpAndOpenFeedbackBoard(page);

    await page.getByPlaceholder("Search...").fill("no matching feedback");
    await expect(page.getByText("No matching feedback")).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("button", { name: MOST_VOTES_BUTTON_REGEX }).click();
    await page.getByRole("menuitemradio", { name: "Newest" }).click();
    await expect(
      page.getByRole("button", { name: NEWEST_BUTTON_REGEX })
    ).toBeVisible({ timeout: 10_000 });

    const relevantErrors = consoleErrors.filter(
      (error) => !error.includes("ResizeObserver")
    );
    expect(relevantErrors).toEqual([]);
  });

  test("navigates public feedback shell tabs without 404s", async ({
    page,
  }) => {
    const responses404: string[] = [];
    page.on("response", (response) => {
      if (response.status() === 404) {
        responses404.push(response.url());
      }
    });

    const orgSlug = await signUpAndOpenFeedbackBoard(page);

    await page.getByRole("tab", { name: "Changelog" }).click();
    await expect(page).toHaveURL(new RegExp(`/${orgSlug}/changelog$`), {
      timeout: 10_000,
    });

    await page.getByRole("tab", { name: "Feedback" }).click();
    await expect(page).toHaveURL(new RegExp(`/${orgSlug}$`), {
      timeout: 10_000,
    });

    const public404 = responses404.filter((url) => url.includes(orgSlug));
    expect(public404).toEqual([]);
  });
});
