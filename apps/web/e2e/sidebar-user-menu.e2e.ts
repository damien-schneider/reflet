import { expect, test } from "@playwright/test";
import {
  makeTestUser,
  openUserMenu,
  signUpAndLandOnDashboard,
} from "./helpers/auth";

test.describe("Sidebar User Menu", () => {
  test("opens the account dropdown from the sidebar", async ({ page }) => {
    const user = makeTestUser("sidebar-user");
    await signUpAndLandOnDashboard(page, user);

    await openUserMenu(page, user);

    await expect(page.getByText("My Account")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Sign out")).toBeVisible({ timeout: 10_000 });
  });
});
