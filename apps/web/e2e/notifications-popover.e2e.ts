import { expect, type Page, test } from "@playwright/test";
import { makeTestUser, signUpAndLandOnDashboard } from "./helpers/auth";

const NOTIFICATION_SETTINGS_URL = /\/dashboard\/account\?tab=notifications$/;

async function openNotifications(page: Page, width: number) {
  await page.setViewportSize({ height: 900, width });
  await signUpAndLandOnDashboard(page, makeTestUser("notification-inbox"));
  await page.getByRole("button", { exact: true, name: "Decline" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome to Reflet" })
  ).toBeVisible();
  if (width < 1024) {
    await page
      .getByRole("button", { exact: true, name: "Toggle Sidebar" })
      .click();
  }
  const trigger = page.getByRole("button", {
    exact: true,
    name: "Notifications",
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const popover = page.getByRole("dialog", {
    exact: true,
    name: "Notifications",
  });
  await expect(popover.getByText("No notifications yet")).toBeVisible();
  return { popover, trigger };
}

for (const { theme, width } of [
  { theme: "light", width: 1280 },
  { theme: "dark", width: 1280 },
  { theme: "dark", width: 320 },
]) {
  test(`notification inbox and settings in ${theme} mode at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript((preferredTheme) => {
      localStorage.setItem("theme", preferredTheme);
      Object.defineProperty(Notification, "permission", {
        get: () => "default",
      });
    }, theme);
    if (width === 320) {
      await page.emulateMedia({ reducedMotion: "reduce" });
    }
    const { popover, trigger } = await openNotifications(page, width);
    const emptyState = popover.locator(
      '[data-control-family="empty"][data-slot="root"]'
    );
    await expect(emptyState).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(emptyState).toHaveCSS("border-top-width", "0px");
    const bounds = await emptyState.boundingBox();
    expect(bounds?.height).toBe(300);
    await expect(
      popover.getByRole("button", { name: "Turn on" })
    ).toBeVisible();
    await expect(
      page.getByRole("complementary", { name: "Browser notifications" })
    ).toHaveCount(1);
    await popover.screenshot({
      animations: "disabled",
      path: testInfo.outputPath(`notifications-${theme}.png`),
    });
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Enter");
    await popover
      .getByRole("link", { name: "Notification settings" })
      .press("Enter");
    await expect(popover).not.toBeVisible();
    await expect(page).toHaveURL(NOTIFICATION_SETTINGS_URL);
    await expect(
      page.getByRole("tab", { name: "Notifications" })
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByText("Enable push notifications", { exact: true })
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("tab", { name: "Notifications" })
    ).toHaveAttribute("aria-selected", "true");
  });
}

test("blocked browser notifications keep settings reachable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(Notification, "permission", { get: () => "denied" });
  });
  const { popover } = await openNotifications(page, 1280);
  await expect(popover.getByRole("button", { name: "Turn on" })).toHaveCount(0);
  await expect(
    popover.getByRole("link", { name: "Notification settings" })
  ).toBeVisible();
});
