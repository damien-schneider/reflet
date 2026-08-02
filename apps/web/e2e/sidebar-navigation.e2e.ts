import { expect, test } from "@playwright/test";
import {
  createOrganization,
  makeOrgName,
  makeTestUser,
  signUpAndLandOnDashboard,
} from "./helpers/auth";

const NAV_LINKS = [
  { name: "Project", path: "project" },
  { name: "Feedback", path: "" },
  { name: "Changelog", path: "changelog" },
  { name: "Inbox", path: "inbox" },
] as const;

test.describe("Sidebar navigation", () => {
  test("points every workspace link at a live route", async ({ page }) => {
    const notFound: string[] = [];
    page.on("response", (response) => {
      if (response.status() === 404) {
        notFound.push(response.url());
      }
    });

    await signUpAndLandOnDashboard(page, makeTestUser("nav"));
    const slug = await createOrganization(page, makeOrgName("Nav Org"));

    for (const link of NAV_LINKS) {
      const expected = link.path
        ? `/dashboard/${slug}/${link.path}`
        : `/dashboard/${slug}`;

      const navLink = page
        .getByRole("link", { name: link.name })
        .filter({ hasText: link.name })
        .first();

      await expect(navLink).toBeVisible({ timeout: 30_000 });
      await expect(navLink).toHaveAttribute("href", expected);
    }

    expect(notFound).toEqual([]);
  });

  test("renders the inbox route directly", async ({ page }) => {
    await signUpAndLandOnDashboard(page, makeTestUser("nav-inbox"));
    const slug = await createOrganization(page, makeOrgName("Nav Inbox Org"));

    await page.goto(`/dashboard/${slug}/inbox`);

    await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Manage support conversations")).toBeVisible();
  });
});
