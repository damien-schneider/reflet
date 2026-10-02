import { expect, type Locator, type Page, test } from "@playwright/test";
import {
  createOrganization,
  makeOrgName,
  makeTestUser,
  signUpAndLandOnDashboard,
} from "./helpers/auth";

const FEEDBACK_TITLE = "Add keyboard shortcuts for navigating feedback";
const FEEDBACK_DRAWER_NAME =
  /^(Feedback|Add keyboard shortcuts for navigating feedback)$/;

async function createFeedback(page: Page) {
  await signUpAndLandOnDashboard(page, makeTestUser("feedback-card"));
  await createOrganization(page, makeOrgName("Feedback Card"));
  await page
    .getByRole("button", { name: "Share an idea or suggestion…" })
    .click();
  await page
    .getByRole("textbox", { name: "Feedback title" })
    .fill(FEEDBACK_TITLE);
  await page.getByRole("button", { exact: true, name: "Submit" }).click();
  const card = page
    .getByRole("list", { name: "Feedback" })
    .getByRole("listitem");
  await expect(card).toHaveCount(1);
  await expect(
    card.getByRole("heading", { name: FEEDBACK_TITLE })
  ).toBeVisible();
  return card;
}

async function expectStablePress(page: Page, button: Locator) {
  const before = await button.boundingBox();
  if (!before) {
    throw new Error("Button has no visible bounds");
  }
  await button.hover();
  await page.mouse.down();
  try {
    await button.evaluate((element) =>
      Promise.all(
        element.getAnimations().map((animation) => animation.finished)
      )
    );
    const after = await button.boundingBox();
    expect(after?.width).toBeCloseTo(before.width, 1);
    expect(after?.height).toBeCloseTo(before.height, 1);
  } finally {
    await page.mouse.move(0, 0);
    await page.mouse.up();
  }
}

test("the entire feedback card opens details and keeps its controls independent", async ({
  page,
}) => {
  const card = await createFeedback(page);
  const bounds = await card.boundingBox();
  if (!bounds) {
    throw new Error("Feedback card has no visible bounds");
  }
  const drawer = page.getByRole("dialog", {
    name: FEEDBACK_DRAWER_NAME,
  });
  for (const y of [bounds.height / 2, bounds.height - 12]) {
    await card.click({ position: { x: bounds.width / 2, y } });
    await expect(drawer, `Card click at y=${y}`).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
  }
  await card.getByRole("button", { name: "Remove upvote" }).click();
  await expect(
    card.getByRole("button", { exact: true, name: "Upvote" })
  ).toBeVisible();
  await expect(drawer).toBeHidden();
  await page.reload();
  await expect(
    card.getByRole("button", { exact: true, name: "Upvote" })
  ).toBeVisible();
  await expect(drawer).toBeHidden();
  await card.getByRole("button", { exact: true, name: "Downvote" }).click();
  await expect(
    card.getByRole("button", { name: "Remove downvote" })
  ).toBeVisible();
  await expect(drawer).toBeHidden();
  await card.getByRole("button", { name: "Properties" }).click();
  await expect(
    card.getByRole("button", { name: "Properties" })
  ).toHaveAttribute("aria-expanded", "true");
  await expect(drawer).toBeHidden();
  await page.keyboard.press("Escape");
  const openFeedback = card.getByRole("button", { name: FEEDBACK_TITLE });
  await openFeedback.focus();
  await page.keyboard.press("Enter");
  await expect(drawer).toBeVisible();
});

test("feedback titles and shared buttons keep their size while pressed", async ({
  page,
}) => {
  const card = await createFeedback(page);
  await expectStablePress(
    page,
    card.getByRole("button", { name: FEEDBACK_TITLE })
  );
  await expectStablePress(
    page,
    card.getByRole("button", { name: "Properties" })
  );
});
