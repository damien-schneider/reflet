import { expect, test } from "@playwright/test";
import { openWidget } from "./sdk/preview";

for (const width of [1440, 390, 320]) {
  test.describe(`Annotation tools at ${width}px`, () => {
    test.use({
      hasTouch: width < 400,
      viewport: { height: width > 400 ? 1000 : 844, width },
    });

    test("draws, edits and cancels text using the quick tools", async ({
      page,
    }, testInfo) => {
      await openWidget(page);
      await page.locator(".annotate-action").click();
      await expect(page.locator(".overlay")).toHaveAttribute(
        "data-opening",
        "false"
      );
      for (const name of ["Rectangle", "Arrow", "Text"]) {
        await expect(
          page.getByRole("button", { exact: true, name })
        ).toBeVisible();
      }
      const done = page.getByRole("button", { exact: true, name: "Done" });
      await expect(done).toHaveText("");
      if (width < 400) {
        const bounds = await done.boundingBox();
        expect(bounds?.height).toBeGreaterThanOrEqual(44);
      }
      await page.getByLabel("Annotation color", { exact: true }).click();
      const colors = await page.locator(".color-popover").boundingBox();
      if (!colors) {
        throw new Error("Color palette missing");
      }
      expect(colors.x).toBeGreaterThanOrEqual(0);
      expect(colors.x + colors.width).toBeLessThanOrEqual(width);
      await page.keyboard.press("Escape");
      const canvas = page.locator(".editor canvas");
      const bounds = await canvas.boundingBox();
      if (!bounds) {
        throw new Error("Drawing surface missing");
      }
      await page.getByRole("button", { exact: true, name: "Arrow" }).click();
      await page.mouse.move(
        bounds.x + bounds.width * 0.2,
        bounds.y + bounds.height * 0.4
      );
      await page.mouse.down();
      await page.mouse.move(
        bounds.x + bounds.width * 0.5,
        bounds.y + bounds.height * 0.5,
        { steps: 5 }
      );
      await page.mouse.up();
      await page.getByRole("button", { exact: true, name: "Text" }).click();
      await canvas.click({
        position: { x: bounds.width * 0.1, y: bounds.height * 0.2 },
      });
      const text = page.getByRole("textbox", { name: "Text annotation" });
      await text.fill("Wrong amount");
      await text.press("Enter");
      await expect(text).not.toBeVisible();
      await canvas.click({
        position: { x: bounds.width * 0.1 + 4, y: bounds.height * 0.2 + 4 },
      });
      await expect(text).toHaveValue("Wrong amount");
      await text.fill("Check this amount");
      await page.getByRole("button", { name: "Apply text" }).click();
      await canvas.click({
        position: { x: bounds.width * 0.1, y: bounds.height * 0.7 },
      });
      await text.fill("Do not keep this");
      await text.press("Escape");
      await expect(page.locator(".overlay")).toBeVisible();
      await expect(text).not.toBeVisible();
      await page.mouse.move(0, 0);
      await page.screenshot({
        path: testInfo.outputPath(`annotation-${width}.png`),
      });
      await done.click();
      await expect(page.locator(".overlay")).not.toBeVisible();
      await expect(page.locator(".annotation-count")).toHaveText("2");
      await page.locator(".annotate-action").click();
      await expect(page.locator(".overlay")).toHaveAttribute(
        "data-opening",
        "false"
      );
      await page.getByRole("button", { exact: true, name: "Text" }).click();
      await canvas.click({
        position: { x: bounds.width * 0.1 + 4, y: bounds.height * 0.2 + 4 },
      });
      await expect(text).toHaveValue("Check this amount");
    });
  });
}
