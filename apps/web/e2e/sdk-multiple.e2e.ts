import { expect, type Page, test } from "@playwright/test";
import {
  drawSpotlight,
  expectWidgetInViewport,
  openWidget,
} from "./sdk/preview";

async function addScreenshot(page: Page, count: number) {
  await page
    .getByRole("button", { exact: true, name: "Attach a screenshot" })
    .click();
  await expect(page.locator(".screenshot-preview")).toHaveCount(count);
}

async function slowImageEncoding(page: Page) {
  await page.addInitScript(() => {
    const toBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function encodeWithLatency(
      callback,
      ...options
    ) {
      toBlob.call(
        this,
        (blob) => setTimeout(() => callback(blob), 900),
        ...options
      );
    };
  });
}

test.describe("Multiple captures on desktop", () => {
  test.use({ colorScheme: "light", viewport: { height: 1000, width: 1440 } });

  test("keeps separate drawings, retakes only one image and retries missing uploads", async ({
    page,
  }, testInfo) => {
    await slowImageEncoding(page);
    const created: unknown[] = [];
    const saved: unknown[] = [];
    let uploadCount = 0;
    let saveAttempts = 0;
    await page.route("**/api/sdk-demo/**", async (route) => {
      const url = route.request().url();
      if (url.endsWith("/create")) {
        created.push(route.request().postDataJSON());
        await route.fulfill({ json: { feedbackId: "demo-report" } });
      } else if (url.endsWith("/upload-url")) {
        await route.fulfill({
          json: { uploadUrl: "http://localhost:3003/api/sdk-demo/upload" },
        });
      } else if (url.endsWith("/upload")) {
        uploadCount++;
        await route.fulfill({ json: { storageId: `image-${uploadCount}` } });
      } else {
        saveAttempts++;
        if (saveAttempts === 2) {
          await route.fulfill({ json: { error: "Try again" }, status: 503 });
          return;
        }
        saved.push(route.request().postDataJSON());
        await route.fulfill({
          json: { screenshotId: `screenshot-${saveAttempts}` },
        });
      }
    });
    await openWidget(page);
    const message = page.getByRole("textbox", {
      name: "What would you like to share?",
    });
    await message.fill("My plan details and invoices show different amounts.");
    await drawSpotlight(page);
    await page.getByRole("button", { exact: true, name: "Done" }).click();
    const original = await page
      .locator(".screenshot-preview img")
      .getAttribute("src");
    await page.getByRole("button", { name: "Manage plan" }).click();
    await page
      .getByRole("button", { exact: true, name: "Attach a screenshot" })
      .click();
    await expect(page.locator(".capture-halo")).toHaveAttribute(
      "data-active",
      "true"
    );
    await expect(page.locator(".capture-halo")).toHaveCSS("opacity", "1");
    await page.mouse.move(0, 0);
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("desktop-capture-halo.png"),
    });
    await expect(page.locator(".screenshot-preview")).toHaveCount(2);
    await expect(page.locator(".capture-halo")).toHaveCSS("opacity", "0");
    await drawSpotlight(page, 1);
    await page.getByRole("button", { exact: true, name: "Done" }).click();
    const second = page.getByRole("group", {
      exact: true,
      name: "Screenshot 2",
    });
    const beforeRetake = await second.locator("img").getAttribute("src");
    await second.hover();
    await second.getByRole("button", { name: "Retake" }).click();
    await expect(second.locator("img")).not.toHaveAttribute(
      "src",
      beforeRetake ?? ""
    );
    await expect(second.locator(".annotation-count")).toHaveCount(0);
    const first = page.getByRole("group", {
      exact: true,
      name: "Screenshot 1",
    });
    await expect(first.locator("img")).toHaveAttribute("src", original ?? "");
    await expect(first.locator(".annotation-count")).toHaveText("1");
    await addScreenshot(page, 3);
    await message.focus();
    await page.mouse.move(0, 0);
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("desktop-multiple.png"),
    });
    await page.getByRole("button", { name: "Minimize feedback" }).click();
    await page.getByRole("button", { name: "Resume feedback" }).click();
    await expect(page.locator(".screenshot-preview")).toHaveCount(3);
    await page
      .getByRole("button", { exact: true, name: "Send feedback" })
      .click();
    await expect(page.locator(".composer").getByRole("alert")).toContainText(
      "screenshots are still pending"
    );
    await expect(message).toBeDisabled();
    await page.getByRole("button", { name: "Retry attachments" }).click();
    await expect(
      page.getByRole("heading", { name: "Feedback sent" })
    ).toBeVisible();
    expect(created).toHaveLength(1);
    expect(saved).toHaveLength(3);
    expect(uploadCount).toBe(4);
    expect(saved).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          annotations: [expect.objectContaining({ type: "spotlight" })],
          feedbackId: "demo-report",
          filename: "screenshot-1.png",
        }),
        expect.objectContaining({
          feedbackId: "demo-report",
          filename: "screenshot-2.png",
        }),
        expect.objectContaining({
          feedbackId: "demo-report",
          filename: "screenshot-3.png",
        }),
      ])
    );
  });
});

test.describe("Multiple captures on touch screens", () => {
  test.use({
    colorScheme: "light",
    hasTouch: true,
    viewport: { height: 844, width: 390 },
  });

  test("scrolls the image strip, removes one capture and keeps touch targets reachable", async ({
    page,
  }, testInfo) => {
    await slowImageEncoding(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openWidget(page);
    await page
      .getByRole("button", { exact: true, name: "Attach a screenshot" })
      .click();
    await expect(page.locator(".capture-halo")).toHaveAttribute(
      "data-active",
      "true"
    );
    await expect(page.locator(".capture-halo")).toHaveCSS(
      "transition-duration",
      "0s"
    );
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("mobile-capture-halo.png"),
    });
    await expect(page.locator(".screenshot-preview")).toHaveCount(2);
    await page.getByRole("button", { name: "Manage plan" }).click();
    await addScreenshot(page, 3);
    await page
      .getByRole("textbox", { name: "What would you like to share?" })
      .fill("The amount changes between these screens.");
    await expectWidgetInViewport(page);
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("mobile-multiple.png"),
    });
    const lastImage = await page
      .getByRole("group", { exact: true, name: "Screenshot 3" })
      .locator("img")
      .getAttribute("src");
    const second = page.getByRole("group", {
      exact: true,
      name: "Screenshot 2",
    });
    await second.getByRole("button", { exact: true, name: "Remove" }).click();
    await expect(page.locator(".screenshot-preview")).toHaveCount(2);
    await expect(
      page
        .getByRole("group", { exact: true, name: "Screenshot 2" })
        .locator("img")
    ).toHaveAttribute("src", lastImage ?? "");
    await expectWidgetInViewport(page);
  });
});
