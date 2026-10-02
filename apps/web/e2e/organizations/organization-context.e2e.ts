import { expect, type Page, type TestInfo, test } from "@playwright/test";
import {
  createOrganization,
  makeOrgName,
  makeTestUser,
  signUpAndLandOnDashboard,
} from "../helpers/auth";

const ACCOUNT_BUTTON_NAME = /^Account:/;
const ORGANIZATION_SWITCHER_NAME = /^Switch organization/;
const ORGANIZATION_URL = /\/dashboard\/(?!account)[^/]+$/;
const FEEDBACK_COMMAND_NAME = /^Feedback/;

test.use({ screenshot: "only-on-failure" });

async function expectAccountPage(page: Page, url: string) {
  await expect(page).toHaveURL(url, { timeout: 15_000 });
  await expect(
    page.getByRole("heading", { exact: true, name: "Account" })
  ).toBeVisible({ timeout: 15_000 });
}

async function openSidebar(page: Page) {
  const viewport = page.viewportSize();
  if (!viewport || viewport.width >= 1024) {
    return;
  }
  const sidebar = page.getByRole("dialog", { exact: true, name: "Sidebar" });
  const trigger = page.locator("[data-sidebar-trigger]");
  if ((await trigger.getAttribute("aria-expanded")) === "false") {
    await expect(sidebar).not.toBeVisible();
    await trigger.click();
  }
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(sidebar).toBeVisible();
}

async function expectWorkspace(page: Page, slug: string, name: string) {
  await openSidebar(page);
  await expect(
    page.getByRole("button", { name: ORGANIZATION_SWITCHER_NAME })
  ).toHaveAccessibleName(`Switch organization. Current: ${name}`);
  await expect(
    page.getByRole("link", { exact: true, name: "Feedback" })
  ).toHaveAttribute("href", `/dashboard/${slug}`);
  await expect(
    page.getByRole("link", { exact: true, name: "General" })
  ).toHaveAttribute("href", `/dashboard/${slug}/project/general`);
}

async function openAccountSettings(page: Page) {
  await openSidebar(page);
  await page.getByRole("button", { name: ACCOUNT_BUTTON_NAME }).click();
  await page.getByRole("menuitem", { name: "Account settings" }).click();
  await expectAccountPage(page, "/dashboard/account");
}

async function createAnotherOrganization(page: Page, name: string) {
  await openSidebar(page);
  await page.getByRole("button", { name: ORGANIZATION_SWITCHER_NAME }).click();
  await page.getByRole("menuitem", { name: "Create organization" }).click();
  const dialog = page.getByRole("dialog", { name: "Create organization" });
  await dialog.getByLabel("Organization name").fill(name);
  await dialog.getByRole("button", { name: "Create organization" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(ORGANIZATION_URL, { timeout: 15_000 });
  const slug = new URL(page.url()).pathname.split("/")[2];
  if (!slug) {
    throw new Error("The new organization has no dashboard URL");
  }
  return slug;
}

interface TestOrganization {
  name: string;
  slug: string;
}

async function verifyNotificationSettings(
  page: Page,
  organization: TestOrganization
) {
  await openSidebar(page);
  await page
    .getByRole("button", { exact: true, name: "Notifications" })
    .click();
  await page.getByRole("link", { name: "Notification settings" }).click();
  await expectAccountPage(page, "/dashboard/account?tab=notifications");
  await expectWorkspace(page, organization.slug, organization.name);
  await expect(
    page.getByRole("link", { exact: true, name: "Feedback" })
  ).not.toHaveAttribute("aria-current");
  await page.reload();
  await expectWorkspace(page, organization.slug, organization.name);
  await page.keyboard.press("Escape");
  if ((page.viewportSize()?.width ?? 1440) < 1024) {
    await expect(
      page.getByRole("dialog", { exact: true, name: "Sidebar" })
    ).not.toBeVisible();
  }
  await page.keyboard.press("ControlOrMeta+k");
  await expect(
    page
      .getByRole("dialog", { name: "Command palette" })
      .getByRole("option", { name: FEEDBACK_COMMAND_NAME })
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Command palette" })
  ).not.toBeVisible();
}

async function verifyOrganizationSwitching(
  page: Page,
  organization: TestOrganization,
  testInfo: TestInfo
) {
  const secondName = makeOrgName("Second workspace");
  const secondSlug = await createAnotherOrganization(page, secondName);
  expect(secondSlug).not.toBe(organization.slug);
  await openAccountSettings(page);
  await expectWorkspace(page, secondSlug, secondName);
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("account-with-workspace.png"),
  });
  await page.getByRole("button", { name: ORGANIZATION_SWITCHER_NAME }).click();
  await page.getByRole("menuitem", { name: organization.name }).click();
  await expect(page).toHaveURL(`/dashboard/${organization.slug}`);
  await openAccountSettings(page);
  await expectWorkspace(page, organization.slug, organization.name);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(`/dashboard/${organization.slug}`);
}

for (const width of [1440, 390]) {
  test(`organization context survives account navigation at ${width}px`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ height: 1000, width });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signUpAndLandOnDashboard(page, makeTestUser("organization-context"));
    await page.getByRole("button", { exact: true, name: "Decline" }).click();
    const name = makeOrgName("First workspace");
    const slug = await createOrganization(page, name);
    const organization = { name, slug };
    await verifyNotificationSettings(page, organization);
    await verifyOrganizationSwitching(page, organization, testInfo);
  });
}
