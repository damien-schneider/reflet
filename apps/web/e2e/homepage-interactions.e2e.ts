import { expect, test } from "@playwright/test";

const PLANNED_HASH = /#journey-planned$/;

test("feature descriptions fit inside their controls at every screen size", async ({
  page,
}) => {
  await page.goto("/");
  for (const width of [1440, 900, 390, 320]) {
    await page.setViewportSize({ height: 900, width });
    const choices = page.getByRole("group", {
      name: "Explore Reflet features",
    });
    await choices.scrollIntoViewIfNeeded();
    const bounds = await choices.getByRole("button").evaluateAll((buttons) =>
      buttons.map((button) => {
        const description = button.querySelector("strong + span");
        const title = button.querySelector("strong");
        if (!(description && title)) {
          throw new Error("Feature text missing");
        }
        return {
          bottom: button.getBoundingClientRect().bottom,
          contentBottom: Math.max(
            title.getBoundingClientRect().bottom,
            description.getBoundingClientRect().bottom
          ),
          left: button.getBoundingClientRect().left,
          right: button.getBoundingClientRect().right,
          top: button.getBoundingClientRect().top,
        };
      })
    );
    for (const [index, boundsForButton] of bounds.entries()) {
      expect(boundsForButton.contentBottom).toBeLessThanOrEqual(
        boundsForButton.bottom
      );
      if (index > 0) {
        const previous = bounds[index - 1];
        expect(
          boundsForButton.top >= previous.bottom ||
            boundsForButton.left >= previous.right
        ).toBe(true);
      }
    }
  }
});

test("the hero leads into the product story without leaving the page", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Listen closely.Build what matters."
  );
  await expect(
    page.getByRole("link", { name: "Start your feedback loop" })
  ).toHaveAttribute("href", "/dashboard");
  await page
    .getByRole("link", { exact: true, name: "Explore the feedback loop" })
    .click();
  await expect(page.getByTestId("feedback-journey")).toHaveAttribute(
    "data-step",
    "capture"
  );
  await expect(
    page.getByRole("navigation", { name: "Feedback journey steps" })
  ).toBeInViewport();
});

test("the interactive widget previews a user's own idea", async ({ page }) => {
  await page.goto("/");
  const preview = page.getByRole("region", {
    name: "Interactive feature preview",
  });
  await expect(
    preview.locator('.feature-preview-body[data-active="true"]')
  ).toHaveCSS("opacity", "1");
  await preview.getByLabel("Your idea").fill("Remember my dashboard filters");
  await preview.getByRole("button", { name: "Send preview feedback" }).click();
  await expect(preview.getByRole("status")).toContainText(
    "Remember my dashboard filters"
  );
  await expect(
    preview.getByRole("button", { name: "Try another idea" })
  ).toBeFocused();
  await preview.getByRole("button", { name: "Try another idea" }).click();
  await expect(preview.getByLabel("Your idea")).toBeVisible();
  await expect(preview.getByLabel("Your idea")).toBeFocused();
  await preview.getByLabel("Your idea").fill("   ");
  await expect(
    preview.getByRole("button", { name: "Send preview feedback" })
  ).toBeDisabled();
});

test("reduced-motion hero links open their matching story step", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const story = page.getByTestId("feedback-journey");
  await expect(story).toHaveAttribute("data-reduced-motion", "true");
  await page
    .getByRole("link", { name: "02 Give it a little direction." })
    .click();
  await expect(page).toHaveURL(PLANNED_HASH);
  await expect(story).toHaveAttribute("data-step", "planned");
  await story.getByRole("link", { name: "Full circle" }).click();
  await expect(story).toHaveAttribute("data-step", "notify");
  await page.goBack();
  await expect(story).toHaveAttribute("data-step", "planned");
});

test("feature selectors and the FAQ work with a keyboard", async ({ page }) => {
  await page.goto("/");
  const planning = page.getByRole("button", { name: "Plan with context" });
  await planning.focus();
  await planning.press("Enter");
  await expect(planning).toHaveAttribute("aria-pressed", "true");
  await expect(
    page
      .getByRole("region", { name: "Interactive feature preview" })
      .locator('[data-active="true"]')
  ).toContainText("Next up");
  const announcement = page.getByRole("button", { name: "Close the loop" });
  await announcement.press("Enter");
  await expect(announcement).toHaveAttribute("aria-pressed", "true");
  await expect(
    page
      .getByRole("region", { name: "Interactive feature preview" })
      .locator('[data-active="true"]')
  ).toContainText("Saved views are here");
  const question = page.getByText("Does AI make decisions for my team?", {
    exact: true,
  });
  await question.focus();
  await question.press("Enter");
  await expect(
    page.getByText(
      "AI helps your team understand and organize incoming requests.",
      { exact: false }
    )
  ).toBeVisible();
});
