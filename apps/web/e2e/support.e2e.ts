import { expect, test } from "@playwright/test";
import {
  createOrganization,
  makeOrgName,
  makeTestUser,
  signUpAndLandOnDashboard,
} from "./helpers/auth";

const PUBLIC_PAGE_CONTROL = /Public support page/;
const PUBLIC_PAGE_CONTROL_ON = /Public support page\s*On/;
const NEEDS_A_HUMAN_ROW = /Needs a human/;

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
  const visibility = page.getByRole("switch", {
    name: "Make organization public",
  });
  await visibility.click();
  await expect(visibility).toBeChecked({ timeout: 15_000 });
  await expect(visibility).toBeEnabled({ timeout: 15_000 });

  await page.goto(`/dashboard/${slug}/inbox`);
  await page.getByRole("button", { name: PUBLIC_PAGE_CONTROL }).click();
  await page
    .getByRole("switch", { name: "Accept messages from visitors" })
    .click();
  await expect(
    page.getByRole("button", { name: PUBLIC_PAGE_CONTROL_ON })
  ).toBeVisible({ timeout: 10_000 });

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
      guest.getByRole("heading", { name: "Contact support" })
    ).toBeVisible({ timeout: 15_000 });

    await guest.getByLabel("Email").fill("guest@example.com");
    await guest.getByLabel("Subject (optional)").fill("Broken export");
    await guest
      .getByPlaceholder("What do you need help with?")
      .fill("My CSV export is empty.");
    await guest.getByRole("button", { exact: true, name: "Send" }).click();

    await expect(guest.getByRole("textbox", { name: "Reply" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(guest.getByText("Broken export")).toBeVisible();
    await expect(
      guest.getByRole("article").filter({ hasText: "My CSV export is empty." })
    ).toBeVisible();

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
    await guest.getByLabel("Email").fill("inbox@example.com");
    await guest.getByLabel("Subject (optional)").fill("Needs a human");
    await guest
      .getByPlaceholder("What do you need help with?")
      .fill("Please call me back.");
    await guest.getByRole("button", { exact: true, name: "Send" }).click();
    await expect(
      guest.getByRole("article").filter({ hasText: "Please call me back." })
    ).toBeVisible({ timeout: 15_000 });
    await guestContext.close();

    await page.goto(`/dashboard/${slug}/inbox`);
    const request = page.getByRole("button", { name: NEEDS_A_HUMAN_ROW });
    await expect(request).toBeVisible({ timeout: 20_000 });
    await request.click();
    await expect(
      page.getByRole("article").filter({ hasText: "Please call me back." })
    ).toBeVisible();
  });
});
