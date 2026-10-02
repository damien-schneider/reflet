import { expect, test } from "@playwright/test";
import {
  createOrganization,
  makeOrgName,
  makeTestUser,
  signUpAndLandOnDashboard,
} from "./helpers/auth";

test("dashboard keeps one frame for document pages, inbox panes, and denied access", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ height: 1000, width: 1440 });
  await signUpAndLandOnDashboard(page, makeTestUser("app-shell"));
  const decline = page.getByRole("button", { exact: true, name: "Decline" });
  if (await decline.isVisible()) {
    await decline.click();
  }
  const slug = await createOrganization(page, makeOrgName("App shell"));
  await page.getByRole("link", { exact: true, name: "Inbox" }).click();
  await expect(page.locator("[data-app-shell]")).toHaveAttribute(
    "data-scroll",
    "none"
  );
  await expect(
    page.getByRole("heading", { exact: true, name: "Inbox" })
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight)
  ).toBeLessThanOrEqual(1001);
  await page
    .getByRole("button", { exact: true, name: "Toggle sidebar" })
    .click();
  await page.getByRole("link", { exact: true, name: "Feedback" }).click();
  await expect(page).toHaveURL(new RegExp(`/dashboard/${slug}$`));
  await expect(page.locator("[data-app-shell]")).toHaveAttribute(
    "data-scroll",
    "page"
  );
  await expect(
    page.getByRole("button", { exact: true, name: "Toggle sidebar" })
  ).toHaveAttribute("aria-expanded", "false");
  await page.goto("/dashboard/super-admin");
  await expect(
    page.getByRole("heading", { name: "Super admins only" })
  ).toBeVisible();
  await expect(page.getByRole("main")).toHaveCount(1);
  const pageBounds = await page
    .locator('[data-control-family="page-layout"][data-slot="root"]')
    .boundingBox();
  if (!pageBounds) {
    throw new Error("Missing page frame");
  }
  expect(pageBounds.y + pageBounds.height).toBeGreaterThanOrEqual(1000);
  await page.screenshot({ path: testInfo.outputPath("denied-page.png") });
});
