import { expect, type Page, test } from "@playwright/test";
import {
  createOrganization,
  makeOrgName,
  makeTestUser,
  signUpAndLandOnDashboard,
} from "./helpers/auth";

const ACCOUNT_BUTTON_NAME = /^Account:/;

const DARK_THEME = /dark/;

const AVATAR_URL = "https://example.com/sidebar-avatar.svg";

async function createMemberProfile(page: Page) {
  await signUpAndLandOnDashboard(page, makeTestUser("sidebar-profile"));
  await page.getByRole("button", { exact: true, name: "Decline" }).click();
  const slug = await createOrganization(page, makeOrgName("Profile"));
  await page.getByRole("button", { name: ACCOUNT_BUTTON_NAME }).click();
  await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Account settings" }).click();
  await page
    .getByRole("textbox", { exact: true, name: "Name" })
    .fill("Jane Doe");
  await page.getByRole("textbox", { name: "Avatar URL" }).fill(AVATAR_URL);
  await page.getByRole("button", { exact: true, name: "Save changes" }).click();
  await expect(
    page.getByRole("button", { name: "Account: Jane Doe" })
  ).toBeVisible();
  await page.goto(`/dashboard/${slug}/project/members`);
}

test("shares the profile photo and fallback between the footer and members", async ({
  page,
}, testInfo) => {
  await page.route(AVATAR_URL, (route) =>
    route.fulfill({
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="steelblue"/><text x="32" y="43" text-anchor="middle" font-size="36" fill="white">J</text></svg>',
      contentType: "image/svg+xml",
    })
  );
  await createMemberProfile(page);
  const account = page.getByRole("button", { name: "Account: Jane Doe" });
  const member = page
    .getByRole("listitem")
    .filter({ has: page.getByText("Jane Doe", { exact: true }) })
    .filter({ hasText: "Owner" });
  for (const location of [account, member]) {
    const photo = location.locator("img");
    await expect(photo).toHaveAttribute("src", AVATAR_URL);
    await expect
      .poll(() =>
        photo.evaluate(
          (image) =>
            image instanceof HTMLImageElement &&
            image.complete &&
            image.naturalWidth > 0
        )
      )
      .toBe(true);
  }
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("sidebar-member-avatar.png"),
  });
  await page.getByRole("button", { name: "Theme System" }).click();
  await page.getByRole("menuitemradio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveClass(DARK_THEME);
  await page.keyboard.press("Escape");
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("sidebar-member-avatar-dark.png"),
  });
  await page.unroute(AVATAR_URL);
  await page.route(AVATAR_URL, (route) => route.fulfill({ status: 404 }));
  await page.reload();
  await expect(account.getByText("JD", { exact: true })).toBeVisible();
  await expect(member.getByText("JD", { exact: true })).toBeVisible();
});
