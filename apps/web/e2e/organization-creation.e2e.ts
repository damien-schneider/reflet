import { expect, test } from "@playwright/test";
import {
  createOrganization,
  makeOrgName,
  makeTestUser,
  signUpAndLandOnDashboard,
} from "./helpers/auth";

test.describe("Organization creation", () => {
  test("creates an organization from the welcome screen", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await signUpAndLandOnDashboard(page, makeTestUser("org-create"));

    await expect(
      page.getByRole("heading", { name: "Welcome to Reflet" })
    ).toBeVisible({ timeout: 15_000 });

    const slug = await createOrganization(page, makeOrgName("Test Org"));

    expect(page.url()).toContain(`/dashboard/${slug}`);
    expect(errors.filter((e) => !e.includes("ResizeObserver"))).toEqual([]);
  });

  test("keeps the dialog open when the name is empty", async ({ page }) => {
    await signUpAndLandOnDashboard(page, makeTestUser("org-error"));

    await expect(
      page.getByRole("heading", { name: "Welcome to Reflet" })
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Select organization" }).click();
    await page.getByText("Create organization").click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await dialog.getByRole("button", { name: "Create" }).click();
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });
  });
});
