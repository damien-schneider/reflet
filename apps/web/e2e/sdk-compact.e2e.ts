import { expect, test } from "@playwright/test";
import {
  drawSpotlight,
  expectWidgetInViewport,
  openWidget,
} from "./sdk/preview";

test.describe("Compact SDK on desktop", () => {
  test.use({ colorScheme: "light", viewport: { height: 1000, width: 1440 } });

  test("expands, annotates, moves and resumes a draft in the host app", async ({
    page,
  }, testInfo) => {
    await openWidget(page);
    const message = page.getByRole("textbox", {
      name: "What would you like to share?",
    });
    const footprint = await page.locator(".root").boundingBox();
    expect(footprint?.width).toBeLessThanOrEqual(360);
    expect(footprint?.height).toBeLessThanOrEqual(240);
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("desktop-compact.png"),
    });
    await message.fill(
      "Manage plan does nothing when I click it. I expected to see my subscription settings."
    );
    await expect(message).toHaveCSS("height", "76px");
    await drawSpotlight(page);
    await page.getByLabel("More drawing tools", { exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(
      page.getByLabel("Annotation color", { exact: true })
    ).toBeFocused();
    await page
      .getByRole("button", { name: "Manage plan" })
      .evaluate((button) => button.focus());
    await expect(
      page.getByLabel("Annotation color", { exact: true })
    ).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(
      page.getByLabel("More drawing tools", { exact: true })
    ).toBeFocused();
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("desktop-spotlight.png"),
    });
    await page.getByRole("button", { exact: true, name: "Done" }).click();
    await page.getByRole("button", { name: "Minimize feedback" }).click();
    await expect(message).not.toBeVisible();
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("desktop-minimized.png"),
    });
    await page.getByRole("button", { name: "Resume feedback" }).click();
    await expect(message).toHaveValue(
      "Manage plan does nothing when I click it. I expected to see my subscription settings."
    );
    await expect(page.locator(".annotation-count")).toHaveText("1");
    const handle = page.getByRole("button", { name: "Move feedback" });
    const before = await handle.boundingBox();
    if (!before) {
      throw new Error("Drag handle missing");
    }
    await handle.press("ArrowLeft");
    const after = await handle.boundingBox();
    expect(after?.x).toBeLessThan(before.x);
    await handle.dragTo(page.getByRole("heading", { name: "Plans & billing" }));
    await expect(page.locator(".root")).toHaveAttribute("data-moved", "true");
    await message.focus();
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("desktop-moved.png"),
    });
  });

  test("dismisses popovers before the composer and keeps email in the draft", async ({
    page,
  }) => {
    await openWidget(page);
    await page.getByLabel("More options", { exact: true }).click();
    await page
      .getByRole("textbox", { exact: true, name: "Email" })
      .fill("reporter@example.com");
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("textbox", { exact: true, name: "Email" })
    ).not.toBeVisible();
    await expect(page.locator(".composer")).toBeVisible();
    await page.getByLabel("More options", { exact: true }).click();
    await expect(
      page.getByRole("textbox", { exact: true, name: "Email" })
    ).toHaveValue("reporter@example.com");
  });

  test("keeps feedback editable after a failed submission", async ({
    page,
  }) => {
    await openWidget(page);
    await page
      .getByRole("textbox", { name: "What would you like to share?" })
      .fill("My invoice is incorrect.");
    await page
      .getByRole("button", { exact: true, name: "Send feedback" })
      .click();
    await page
      .getByRole("button", { exact: true, name: "Send without email" })
      .click();
    await expect(page.locator(".composer").getByRole("alert")).toContainText(
      "This is a preview. No feedback was sent."
    );
    await expect(
      page.getByRole("textbox", { name: "What would you like to share?" })
    ).toHaveValue("My invoice is incorrect.");
    await expect(
      page.getByRole("button", { exact: true, name: "Send feedback" })
    ).toBeEnabled();
  });
});

test.describe("Compact SDK on touch screens", () => {
  test.use({
    colorScheme: "light",
    hasTouch: true,
    viewport: { height: 844, width: 390 },
  });

  test("shows image actions without hover and fits a phone", async ({
    page,
  }, testInfo) => {
    await openWidget(page);
    await expect(
      page.getByRole("button", { exact: true, name: "Remove" })
    ).toBeVisible();
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("mobile-compact.png"),
    });
    await page
      .getByRole("textbox", { name: "What would you like to share?" })
      .fill("I can’t open my plan details from my phone.");
    await expect(page.locator(".message-row textarea")).toHaveCSS(
      "height",
      "76px"
    );
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("mobile-expanded.png"),
    });
    const bounds = await page.locator(".root").boundingBox();
    expect(bounds?.x).toBeGreaterThanOrEqual(0);
    expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(390);
    await drawSpotlight(page);
    await page.getByLabel("Annotation color", { exact: true }).click();
    await page.locator('.color-spectrum input[type="color"]').fill("#3b82f6");
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("mobile-annotation.png"),
    });
    await page.keyboard.press("Escape");
    await expect(page.locator(".overlay")).toBeVisible();
    await page.getByRole("button", { exact: true, name: "Done" }).click();
    await page.getByRole("button", { exact: true, name: "Remove" }).click();
    await expect(page.locator(".screenshot-preview")).not.toBeVisible();
    await page
      .getByRole("button", { exact: true, name: "Attach a screenshot" })
      .click();
    await expect(page.locator(".screenshot-preview")).toBeVisible();
    await expect(page.locator(".annotation-count")).not.toBeVisible();
  });

  test("writes the comment on the picked element before attaching it", async ({
    page,
  }, testInfo) => {
    await openWidget(page);
    await page
      .locator('.capture-action[aria-label="Point at an element"]')
      .tap();
    const target = page.getByRole("button", { name: "Manage plan" });
    await target.tap();

    const note = page.getByRole("textbox", {
      name: "Comment on the picked element",
    });
    await expect(note).toBeFocused();
    await expect(page.locator(".selection-badge")).toHaveCount(0);

    const card = await page.locator(".picker-note").boundingBox();
    const element = await target.boundingBox();
    if (!(card && element)) {
      throw new Error("Note card or picked element missing");
    }
    const distance = Math.min(
      Math.abs(element.y - (card.y + card.height)),
      Math.abs(card.y - (element.y + element.height))
    );
    expect(distance).toBeLessThanOrEqual(24);
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("mobile-element-note.png"),
    });

    await note.fill("This does nothing on my phone.");
    await page.getByRole("button", { name: "Attach this element" }).tap();

    await expect(page.locator(".selection-badge")).toHaveCount(1);
    await expect(page.locator(".selection-outline")).toBeVisible();
    await expect(page.locator(".annotation-count")).toHaveCount(0);
    await page.locator(".annotate-action").last().tap();
    await expect(
      page.getByRole("textbox", { name: "Comment on the picked element" })
    ).toHaveValue("This does nothing on my phone.");
    await page.getByRole("button", { name: "Done" }).tap();
    await expect(
      page.getByRole("textbox", { name: "What would you like to share?" })
    ).toHaveValue("");
    await expect(
      page.getByRole("button", { exact: true, name: "Send feedback" })
    ).toBeEnabled();
  });
});

test.describe("SDK submission and constrained layouts", () => {
  test("sends the annotated screenshot with the report", async ({ page }) => {
    const submissions: unknown[] = [];
    const screenshots: unknown[] = [];
    await page.route("**/api/sdk-demo/**", async (route) => {
      const url = route.request().url();
      if (url.endsWith("/create")) {
        submissions.push(route.request().postDataJSON());
        await route.fulfill({ json: { feedbackId: "demo-report" } });
      } else if (url.endsWith("/upload-url")) {
        await route.fulfill({
          json: { uploadUrl: "http://localhost:3003/api/sdk-demo/upload" },
        });
      } else if (url.endsWith("/save")) {
        screenshots.push(route.request().postDataJSON());
        await route.fulfill({ json: { screenshotId: "demo-screenshot" } });
      } else {
        await route.fulfill({ json: { storageId: "demo-image" } });
      }
    });
    await openWidget(page);
    await drawSpotlight(page);
    await page.getByRole("button", { exact: true, name: "Done" }).click();
    await page
      .getByRole("textbox", { name: "What would you like to share?" })
      .fill("Let me download all invoices together.");
    await page
      .getByRole("button", { exact: true, name: "Send feedback" })
      .click();
    await page
      .getByRole("button", { exact: true, name: "Send without email" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Feedback sent" })
    ).toBeVisible();
    expect(submissions).toHaveLength(1);
    expect(submissions[0]).toMatchObject({
      description: "Let me download all invoices together.",
      title: "Let me download all invoices together.",
    });
    expect(screenshots).toHaveLength(1);
    expect(screenshots[0]).toMatchObject({
      annotatedStorageId: "demo-image",
      annotations: [expect.objectContaining({ type: "spotlight" })],
    });
  });

  test("sends one selection per picked element and uses the first note as the body", async ({
    page,
  }) => {
    const submissions: Record<string, unknown>[] = [];
    await page.route("**/api/sdk-demo/**", async (route) => {
      const url = route.request().url();
      if (url.endsWith("/create")) {
        submissions.push(route.request().postDataJSON());
        await route.fulfill({ json: { feedbackId: "demo-report" } });
      } else if (url.endsWith("/upload-url")) {
        await route.fulfill({
          json: { uploadUrl: "http://localhost:3003/api/sdk-demo/upload" },
        });
      } else {
        await route.fulfill({ json: { storageId: "demo-image" } });
      }
    });
    await openWidget(page);
    await page
      .locator('.capture-action[aria-label="Point at an element"]')
      .click();
    await page.getByRole("button", { name: "Manage plan" }).click();
    await page
      .getByRole("textbox", { name: "Comment on the picked element" })
      .fill("Opens nothing.");
    await page.keyboard.press("Enter");
    await expect(page.locator(".selection-badge")).toHaveCount(1);
    await page
      .locator('.capture-action[aria-label="Point at an element"]')
      .click();
    await page.getByText("Visa ending in 4242").click();
    await page
      .getByRole("textbox", { name: "Comment on the picked element" })
      .fill("Wrong card shown.");
    await page.keyboard.press("Enter");
    await expect(page.locator(".selection-badge")).toHaveCount(2);
    await page
      .getByRole("button", { exact: true, name: "Send feedback" })
      .click();
    await page
      .getByRole("button", { exact: true, name: "Send without email" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Feedback sent" })
    ).toBeVisible();

    expect(submissions).toHaveLength(1);
    expect(submissions[0]).toMatchObject({
      context: {
        selections: [
          {
            comment: "Opens nothing.",
            componentStack: expect.arrayContaining(["Button"]),
          },
          { comment: "Wrong card shown." },
        ],
      },
      description: "Opens nothing.",
    });
  });

  test("keeps a moved widget reachable in dark mode at 320px", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ height: 568, width: 320 });
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await openWidget(page);
    const message = page.getByRole("textbox", {
      name: "What would you like to share?",
    });
    await message.fill(
      "The invoice description is much longer than expected. ".repeat(60)
    );
    await expect(message).toHaveCSS("transition-duration", "0s");
    await page
      .getByRole("button", { name: "Move feedback" })
      .press("ArrowLeft");
    await page.setViewportSize({ height: 420, width: 320 });
    await message.focus();
    await expectWidgetInViewport(page);
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("narrow-dark.png"),
    });
  });

  test("retakes a drawing and picks an element without activating the app", async ({
    page,
  }) => {
    await openWidget(page);
    await drawSpotlight(page);
    await page.getByLabel("More drawing tools", { exact: true }).click();
    await page.getByRole("button", { exact: true, name: "Retake" }).click();
    await expect(page.locator(".overlay")).not.toBeVisible();
    await expect(page.locator(".screenshot-preview")).toBeVisible();
    await expect(page.locator(".annotation-count")).not.toBeVisible();
    await page.getByRole("button", { name: "Point at an element" }).click();
    await page.getByRole("button", { name: "Manage plan" }).click();
    await page
      .getByRole("textbox", { name: "Comment on the picked element" })
      .fill("Nothing happens when I press this.");
    await page.keyboard.press("Enter");
    await expect(page.locator(".selection-badge")).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "Hide plan details" })
    ).not.toBeVisible();
    await page
      .locator(".screenshot-attachment")
      .last()
      .getByRole("button", { exact: true, name: "Remove" })
      .click();
    await expect(page.locator(".selection-badge")).toHaveCount(0);
    await expect(page.locator(".selection-outline")).toHaveCount(0);
  });
});

test("reveals an invalid email before sending from the compact composer", async ({
  page,
}) => {
  await openWidget(page);
  await page.getByLabel("More options", { exact: true }).click();
  await page
    .getByRole("textbox", { exact: true, name: "Email" })
    .fill("not-an-email");
  await page.keyboard.press("Escape");
  await page
    .getByRole("textbox", { name: "What would you like to share?" })
    .fill("My plan details will not open.");
  await page
    .getByRole("button", { exact: true, name: "Send feedback" })
    .click();
  await expect(
    page.getByRole("textbox", { exact: true, name: "Email" })
  ).toBeVisible();
  await expect(page.locator(".email-field")).toContainText(
    "Enter a valid email address."
  );
});
