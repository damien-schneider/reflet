import { expect, test } from "@playwright/test";
import {
  createOrganization,
  makeOrgName,
  makeTestUser,
  signUpAndLandOnDashboard,
} from "./helpers/auth";

test("dashboard keeps one frame for document pages and inbox panes", async ({
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
  const feedbackTitle = page.getByRole("heading", {
    exact: true,
    name: "Feedback",
  });
  await expect(feedbackTitle).toBeVisible();
  const composer = page.getByRole("button", {
    name: "Share an idea or suggestion…",
  });
  await expect(composer).toBeVisible();
  const titleBounds = await feedbackTitle.boundingBox();
  const composerBounds = await composer.boundingBox();
  if (!(titleBounds && composerBounds)) {
    throw new Error("Missing feedback content bounds");
  }
  expect(composerBounds.width).toBeGreaterThan(700);
  expect(Math.abs(composerBounds.x - titleBounds.x)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("loaded-feedback.png") });
});
