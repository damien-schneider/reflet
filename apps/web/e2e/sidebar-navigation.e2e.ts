import { expect, type Page, type TestInfo, test } from "@playwright/test";
import {
  createOrganization,
  makeOrgName,
  makeTestUser,
  signUpAndLandOnDashboard,
} from "./helpers/auth";

const ACCOUNT_BUTTON_NAME = /^Account:/;

const GROUPS = [
  {
    links: [
      "Feedback",
      "Changelog",
      "Inbox",
      "Surveys",
      "Intelligence",
      "Status",
    ],
    name: "Workspace",
  },
  {
    links: ["GitHub", "Agents & CLI", "API keys", "In-app"],
    name: "Developer tools",
  },
  {
    links: ["General", "Members", "Domains", "Billing", "Trash"],
    name: "Organization",
  },
];

async function checkNavigationGroups(page: Page) {
  for (const group of GROUPS) {
    const menu = page.getByRole("list", { exact: true, name: group.name });
    for (const name of group.links) {
      const link = menu.getByRole("link", { exact: true, name });
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeInViewport();
    }
  }
  await expect(
    page.getByRole("link", { exact: true, name: "General" })
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("button", { name: ACCOUNT_BUTTON_NAME })
  ).toBeInViewport();
  await expect(
    page.getByRole("link", { name: "Upgrade to Pro" })
  ).toBeInViewport();
}

async function checkResizableSidebar(
  page: Page,
  testInfo: TestInfo,
  billingHref: string
) {
  const rail = page.getByRole("separator", { name: "Resize sidebar" });
  await rail.focus();
  await page.keyboard.press("End");
  await expect(rail).toHaveAttribute("aria-valuenow", "420");
  await page.keyboard.press("Home");
  await expect(rail).toHaveAttribute("aria-valuenow", "224");
  const bounds = await rail.boundingBox();
  if (!bounds) {
    throw new Error("Resize rail has no hit area");
  }
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(300, bounds.y + bounds.height / 2);
  await page.mouse.up();
  await expect(rail).toHaveAttribute("aria-valuenow", "300");
  await rail.focus();
  await page.keyboard.press("Enter");
  await expect(rail).toHaveAttribute("aria-valuetext", "collapsed");
  await expect(
    page.getByRole("link", { name: "Upgrade to Pro" })
  ).toBeInViewport();
  await page.getByRole("button", { name: ACCOUNT_BUTTON_NAME }).click();
  await expect(
    page.getByRole("menuitem", { name: "Account settings" })
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Owner", { exact: true })).toBeVisible();
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("sidebar-collapsed.png"),
  });
  await page.keyboard.press("ControlOrMeta+b");
  await expect(rail).toHaveAttribute("aria-valuenow", "300");
  await page.getByRole("link", { name: "Upgrade to Pro" }).click();
  await expect(page).toHaveURL(billingHref);
}

async function openOrganizationSettings(page: Page, mobile: boolean) {
  await signUpAndLandOnDashboard(page, makeTestUser("sidebar-nav"));
  await page.getByRole("button", { exact: true, name: "Decline" }).click();
  const slug = await createOrganization(page, makeOrgName("Sidebar"));
  await page.goto(`/dashboard/${slug}/project/general`);
  const trigger = page.getByRole("button", {
    exact: true,
    name: "Toggle Sidebar",
  });
  if (mobile) {
    await trigger.click();
  }
  return { slug, trigger };
}

for (const viewport of [
  { height: 1000, width: 1440 },
  { height: 720, width: 1100 },
  { height: 844, width: 390 },
  { height: 700, width: 320 },
]) {
  test(`sidebar navigation at ${viewport.width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    if (viewport.width === 1100 || viewport.width === 320) {
      await page.emulateMedia({ reducedMotion: "reduce" });
    }
    const mobile = viewport.width < 1024;
    const { slug, trigger } = await openOrganizationSettings(page, mobile);
    expect(
      await page.getByRole("button", { exact: true, name: "Project" }).count()
    ).toBe(0);

    await checkNavigationGroups(page);
    await page
      .getByRole("link", { exact: true, name: "Feedback" })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("sidebar-expanded.png"),
    });

    await page.getByRole("link", { exact: true, name: "Members" }).click();
    await expect(page).toHaveURL(`/dashboard/${slug}/project/members`);
    if (mobile) {
      await expect(
        page.getByRole("dialog", { exact: true, name: "Sidebar" })
      ).not.toBeVisible();
      await trigger.click();
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
    } else {
      await checkResizableSidebar(
        page,
        testInfo,
        `/dashboard/${slug}/project/billing`
      );
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      )
    ).toBe(false);
  });
}
