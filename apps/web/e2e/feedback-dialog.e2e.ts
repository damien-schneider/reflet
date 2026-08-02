import { expect, type Page, test } from "@playwright/test";
import {
  createOrganization,
  makeOrgName,
  makeTestUser,
  signUpAndLandOnDashboard,
} from "./helpers/auth";

async function createPublicOrg(page: Page) {
  await signUpAndLandOnDashboard(page, makeTestUser("feedback"));
  const slug = await createOrganization(page, makeOrgName("Feedback Org"));

  await page.goto(`/dashboard/${slug}/project/general`);
  await expect(page.locator("#org-slug")).toHaveValue(slug, {
    timeout: 30_000,
  });
  await page.getByRole("switch", { name: "Make organization public" }).click();
  await page.getByRole("button", { exact: true, name: "Save Changes" }).click();
  await expect(page.getByText("Saved")).toBeVisible({ timeout: 15_000 });

  return slug;
}

test.describe("Public feedback board", () => {
  test("exposes the search control on the public board", async ({ page }) => {
    const slug = await createPublicOrg(page);

    await page.goto(`/${slug}`);

    await expect(page.getByPlaceholder("Search...").first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("raises no console error on the public board", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });
    page.on("pageerror", (error) => errors.push(error.message));

    const slug = await createPublicOrg(page);
    await page.goto(`/${slug}`);
    await expect(page.getByPlaceholder("Search...").first()).toBeVisible({
      timeout: 20_000,
    });

    expect(errors.filter((e) => !e.includes("ResizeObserver"))).toEqual([]);
  });
});
