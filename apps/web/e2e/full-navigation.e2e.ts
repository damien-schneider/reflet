import { expect, test } from "@playwright/test";
import {
  createOrganization,
  makeOrgName,
  makeTestUser,
  signUpAndLandOnDashboard,
} from "./helpers/auth";

const DASHBOARD_ROUTES = [
  "",
  "/project/github",
  "/project/general",
  "/project/members",
  "/project/billing",
  "/changelog",
  "/inbox",
  "/status",
  "/in-app",
  "/surveys",
  "/intelligence",
  "/trash",
];

const PUBLIC_ROUTES = ["", "/changelog", "/roadmap"];

async function makePublicOrg(page: import("@playwright/test").Page) {
  await signUpAndLandOnDashboard(page, makeTestUser("fullnav"));
  const slug = await createOrganization(page, makeOrgName("Full Nav Org"));

  await page.goto(`/dashboard/${slug}/project/general`);
  await expect(page.locator("#org-slug")).toHaveValue(slug, {
    timeout: 30_000,
  });
  await page.getByRole("switch", { name: "Make organization public" }).click();
  await page.getByRole("button", { exact: true, name: "Save Changes" }).click();
  await expect(page.getByText("Saved")).toBeVisible({ timeout: 15_000 });

  return slug;
}

test.describe("Navigation smoke test", () => {
  test("opens every dashboard route without a 404 or error boundary", async ({
    page,
  }) => {
    const notFound: string[] = [];
    page.on("response", (response) => {
      if (response.status() === 404) {
        notFound.push(response.url());
      }
    });

    await signUpAndLandOnDashboard(page, makeTestUser("fullnav-dash"));
    const slug = await createOrganization(page, makeOrgName("Full Nav Org"));

    for (const route of DASHBOARD_ROUTES) {
      await page.goto(`/dashboard/${slug}${route}`);
      await expect(
        page.getByRole("heading", { name: "Something went wrong" })
      ).toBeHidden({ timeout: 30_000 });
      await expect(
        page.getByRole("heading", { name: "Page error" })
      ).toBeHidden();
    }

    expect(notFound.filter((url) => url.includes("/dashboard/"))).toEqual([]);
  });

  test("opens every public org route without a 404", async ({ page }) => {
    const notFound: string[] = [];
    page.on("response", (response) => {
      if (response.status() === 404) {
        notFound.push(response.url());
      }
    });

    const slug = await makePublicOrg(page);

    for (const route of PUBLIC_ROUTES) {
      await page.goto(`/${slug}${route}`);
      await expect(
        page.getByRole("heading", { name: "Organization not found" })
      ).toBeHidden({ timeout: 30_000 });
    }

    expect(notFound.filter((url) => url.includes(slug))).toEqual([]);
  });
});
