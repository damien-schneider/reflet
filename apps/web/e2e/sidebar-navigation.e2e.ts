import { expect, test } from "@playwright/test";
import {
  createOrganization,
  makeOrgName,
  makeTestUser,
  signUpAndLandOnDashboard,
} from "./helpers/auth";

const NAV_LINKS = [
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

    const project = page.getByRole("button", { exact: true, name: "Project" });
    await project.click();
    await expect(project).toHaveAttribute("aria-expanded", "true");
    await expect(
      page.getByRole("list", { exact: true, name: "Project" }).getByRole("link")
    ).toHaveCount(7);

    expect(notFound).toEqual([]);
  });

  test("renders the inbox route directly", async ({ page }) => {
    await signUpAndLandOnDashboard(page, makeTestUser("nav-inbox"));
    const slug = await createOrganization(page, makeOrgName("Nav Inbox Org"));

    await page.goto(`/dashboard/${slug}/inbox`);

    await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible({
      timeout: 30_000,
    });
  });
});

for (const viewport of [
  { height: 1000, width: 1440 },
  { height: 1000, width: 900 },
  { height: 844, width: 390 },
]) {
  test(`project submenu navigation at ${viewport.width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    if (viewport.width === 900) {
      await page.emulateMedia({ reducedMotion: "reduce" });
    }
    await signUpAndLandOnDashboard(page, makeTestUser("project-nav"));
    const slug = await createOrganization(page, makeOrgName("Project Nav"));
    await page.goto(`/dashboard/${slug}/project/general`);

    const mobile = viewport.width < 1024;
    const sidebarTrigger = page.getByRole("button", {
      exact: true,
      name: "Toggle Sidebar",
    });
    if (mobile) {
      await sidebarTrigger.click();
      await expect(
        page.getByRole("dialog", { exact: true, name: "Sidebar" })
      ).toBeInViewport({ ratio: 1 });
    }

    const project = page.getByRole("button", { exact: true, name: "Project" });
    const submenu = page.getByRole("list", { exact: true, name: "Project" });
    await expect(project).toHaveAttribute("aria-expanded", "true");
    await expect(
      submenu.getByRole("link", { exact: true, name: "Organization" })
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByRole("link", { exact: true, name: "Members" })
    ).toHaveCount(1);
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("project-sidebar.png"),
    });

    await submenu.getByRole("link", { exact: true, name: "Members" }).click();
    await expect(page).toHaveURL(`/dashboard/${slug}/project/members`);
    if (mobile) {
      await expect(
        page.getByRole("dialog", { exact: true, name: "Sidebar" })
      ).not.toBeVisible();
      await sidebarTrigger.click();
      await page.keyboard.press("Escape");
      await expect(sidebarTrigger).toBeFocused();
    } else {
      await expect(
        submenu.getByRole("link", { exact: true, name: "Members" })
      ).toHaveAttribute("aria-current", "page");
      await page.keyboard.press("ControlOrMeta+b");
      await expect(submenu).not.toBeVisible();
      await project.click();
      await expect(submenu).toBeVisible();
    }

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("project-content.png"),
    });
  });
}
