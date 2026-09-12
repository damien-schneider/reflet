import { expect, type Page, test } from "@playwright/test";
import { openWidget } from "./sdk/preview";

async function expectTintedDrawing(page: Page) {
  const canvas = page.locator(".editor canvas");
  const bounds = await canvas.boundingBox();
  if (!bounds) {
    throw new Error("Drawing surface missing");
  }
  await page.mouse.move(
    bounds.x + bounds.width * 0.1,
    bounds.y + bounds.height * 0.18
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.9,
    bounds.y + bounds.height * 0.42,
    { steps: 5 }
  );
  await page.mouse.up();
  await expect
    .poll(() =>
      canvas.evaluate((element: HTMLCanvasElement) => {
        const context = element.getContext("2d");
        if (!context) {
          throw new Error("Drawing context missing");
        }
        const pixels = context.getImageData(
          Math.round(element.width * 0.5),
          Math.round(element.height * 0.18) - 2,
          1,
          5
        ).data;
        for (let offset = 0; offset < pixels.length; offset += 4) {
          if (
            pixels[offset] === 197 &&
            pixels[offset + 1] === 174 &&
            pixels[offset + 2] === 251
          ) {
            return true;
          }
        }
        return false;
      })
    )
    .toBe(true);
}

for (const width of [1440, 390, 320]) {
  test.describe(`Annotation color at ${width}px`, () => {
    test.use({
      colorScheme: width === 1440 ? "dark" : "light",
      hasTouch: width < 400,
      viewport: { height: width > 400 ? 1000 : 844, width },
    });

    test("adjusts a custom color without losing its hue at white", async ({
      page,
    }, testInfo) => {
      await page.emulateMedia({
        reducedMotion: width === 320 ? "reduce" : "no-preference",
      });
      await openWidget(page);
      await page.locator(".screenshot-preview").click();
      await expect(page.locator(".overlay")).toHaveAttribute(
        "data-opening",
        "false"
      );
      const trigger = page.getByLabel("Annotation color", { exact: true });
      await trigger.focus();
      await page.keyboard.press("Enter");
      const slider = page.getByRole("slider", { name: "Color strength" });
      await expect(slider).toBeVisible();
      await page.keyboard.press("Tab");
      await expect(slider).toBeFocused();
      await page.keyboard.press("Tab");
      const colorButton = page.getByRole("button", {
        exact: true,
        name: "Custom color",
      });
      await expect(colorButton).toBeFocused();
      const customColor = page.locator('.color-spectrum input[type="color"]');
      await customColor.evaluate((input) => {
        input.addEventListener(
          "click",
          (event) => {
            event.preventDefault();
            input.setAttribute("data-picker-requested", "true");
          },
          { once: true }
        );
      });
      await colorButton.press("Enter");
      await expect(customColor).toHaveAttribute(
        "data-picker-requested",
        "true"
      );
      await customColor.fill("#8b5cf6");
      const preview = page.locator(".color-preview");
      await expect(preview).toHaveCSS("background-color", "rgb(139, 92, 246)");
      await slider.press("Home");
      await expect(preview).toHaveCSS("background-color", "rgb(255, 255, 255)");
      await slider.press("End");
      await expect(preview).toHaveCSS("background-color", "rgb(139, 92, 246)");
      for (let step = 0; step < 5; step++) {
        await slider.press("PageDown");
      }
      await expect(preview).toHaveCSS("background-color", "rgb(197, 174, 251)");
      await page.keyboard.press("Escape");
      await expectTintedDrawing(page);
      await trigger.click();
      const capsule = page.locator(".color-popover");
      const bounds = await capsule.boundingBox();
      if (!bounds) {
        throw new Error("Color controls missing");
      }
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(bounds.height).toBeLessThanOrEqual(58);
      const toolbar = await page.locator(".toolbar").boundingBox();
      if (!toolbar) {
        throw new Error("Drawing toolbar missing");
      }
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(toolbar.y);
      if (width < 400) {
        expect(
          (await colorButton.boundingBox())?.height
        ).toBeGreaterThanOrEqual(44);
        expect(
          (await page.locator(".color-slider-control").boundingBox())?.height
        ).toBeGreaterThanOrEqual(44);
      }
      await page.mouse.move(0, 0);
      await page.screenshot({
        path: testInfo.outputPath(`color-${width}.png`),
      });
      await capsule.screenshot({
        path: testInfo.outputPath(`color-detail-${width}.png`),
      });
      await page.keyboard.press("Escape");
      await expect(capsule).not.toBeVisible();
      await expect(trigger).toBeFocused();
      await expect(page.locator(".overlay")).toBeVisible();
      await trigger.press("Enter");
      await expect(slider).toHaveValue("50");
      await customColor.fill("#22c55e");
      await expect(slider).toHaveValue("100");
      await expect(preview).toHaveCSS("background-color", "rgb(34, 197, 94)");
      const control = await page.locator(".color-slider-control").boundingBox();
      if (!control) {
        throw new Error("Color slider missing");
      }
      const pointerY = control.y + control.height / 2;
      if (width < 400) {
        await page.touchscreen.tap(control.x + control.width * 0.25, pointerY);
      } else {
        await page.mouse.move(control.x + control.width, pointerY);
        await page.mouse.down();
        await page.mouse.move(control.x + control.width * 0.25, pointerY, {
          steps: 8,
        });
        await page.mouse.up();
      }
      await expect(slider).toHaveValue("25");
      await expect(preview).toHaveCSS("background-color", "rgb(200, 241, 215)");
    });
  });
}
