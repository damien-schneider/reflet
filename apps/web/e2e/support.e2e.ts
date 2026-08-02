import { expect, test } from "@playwright/test";
import {
  createOrganization,
  makeOrgName,
  makeTestUser,
  signUpAndLandOnDashboard,
} from "./helpers/auth";

async function createOrgWithSupportEnabled(
  page: import("@playwright/test").Page
) {
  const user = makeTestUser("support");
  await signUpAndLandOnDashboard(page, user);

  const slug = await createOrganization(page, makeOrgName("Support Org"));

  // guests only reach /[orgSlug]/support once the org itself is public
  await page.goto(`/dashboard/${slug}/project/general`);
  // the form resets from the org query, so wait for it to hydrate before editing
  await expect(page.locator("#org-slug")).toHaveValue(slug, {
    timeout: 15_000,
  });
  await page.getByRole("switch", { name: "Make organization public" }).click();
  await page.getByRole("button", { exact: true, name: "Save Changes" }).click();
  await expect(page.getByText("Saved")).toBeVisible({ timeout: 15_000 });

  await page.goto(`/dashboard/${slug}/inbox`);
  await page.getByRole("button", { exact: true, name: "Settings" }).click();
  await page
    .getByRole("switch", { name: "Enable public support page" })
    .click();
  await expect(
    page.getByText("Your inbox is private", { exact: false })
  ).toBeHidden({ timeout: 10_000 });

  return slug;
}

test.describe("Public support page", () => {
  test("tells the visitor when the organization does not exist", async ({
    page,
  }) => {
    await page.goto("/definitely-not-an-org-slug/support");

    await expect(
      page.getByRole("heading", { name: "Organization not found" })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("tells the visitor when support is switched off", async ({ page }) => {
    const user = makeTestUser("support-off");
    await signUpAndLandOnDashboard(page, user);
    const slug = await createOrganization(page, makeOrgName("Quiet Org"));

    await page.goto(`/${slug}/support`);

    await expect(
      page.getByRole("heading", { name: "Support unavailable" })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("lets a guest open a conversation and read it back", async ({
    browser,
    page,
  }) => {
    const slug = await createOrgWithSupportEnabled(page);

    const guestContext = await browser.newContext();
    const guest = await guestContext.newPage();

    await guest.goto(`/${slug}/support`);
    await expect(
      guest.getByRole("heading", { name: "Contact Support" })
    ).toBeVisible({ timeout: 15_000 });

    await guest.getByPlaceholder("Your email *").fill("guest@example.com");
    await guest.getByPlaceholder("Subject (optional)").fill("Broken export");
    await guest
      .getByPlaceholder("What do you need help with?")
      .fill("My CSV export is empty.");
    await guest.getByRole("button", { exact: true, name: "Send" }).click();

    await expect(guest.getByText("Broken export")).toBeVisible({
      timeout: 15_000,
    });
    await expect(guest.getByText("My CSV export is empty.")).toBeVisible();

    await guest
      .getByRole("button", { exact: true, name: "All conversations" })
      .click();
    await expect(guest.getByText("Your conversations")).toBeVisible({
      timeout: 10_000,
    });

    await guestContext.close();
  });

  test("shows the guest request in the admin inbox", async ({
    browser,
    page,
  }) => {
    const slug = await createOrgWithSupportEnabled(page);

    const guestContext = await browser.newContext();
    const guest = await guestContext.newPage();
    await guest.goto(`/${slug}/support`);
    await guest.getByPlaceholder("Your email *").fill("inbox@example.com");
    await guest.getByPlaceholder("Subject (optional)").fill("Needs a human");
    await guest
      .getByPlaceholder("What do you need help with?")
      .fill("Please call me back.");
    await guest.getByRole("button", { exact: true, name: "Send" }).click();
    await expect(guest.getByText("Please call me back.")).toBeVisible({
      timeout: 15_000,
    });
    await guestContext.close();

    await page.goto(`/dashboard/${slug}/inbox`);
    await expect(page.getByText("Needs a human").first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Please call me back.").first()).toBeVisible();
  });
});
