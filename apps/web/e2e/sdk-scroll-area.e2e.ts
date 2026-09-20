import { expect, test } from "@playwright/test";
import { openWidget } from "./sdk/preview";

test.use({ hasTouch: true });

for (const width of [390, 320]) {
  test.describe(`Screenshot scrolling at ${width}px`, () => {
    test.use({ hasTouch: true, viewport: { height: 844, width } });

    test("fades only the overflowing edges and keeps every screenshot reachable", async ({
      page,
    }, testInfo) => {
      await openWidget(page);
      const viewport = page.getByRole("region", {
        exact: true,
        name: "Screenshot",
      });
      await expect(viewport).toBeVisible();
      await expect(viewport).not.toHaveAttribute("data-has-overflow-x");
      for (let count = 2; count <= 4; count++) {
        await page
          .getByRole("button", { exact: true, name: "Attach a screenshot" })
          .click();
        await expect(page.locator(".screenshot-preview")).toHaveCount(count);
      }
      await expect(viewport).toHaveAttribute("data-overflow-x-start");
      await expect(viewport).not.toHaveAttribute("data-overflow-x-end");
      await expect(viewport).toHaveCSS("--rf-fade-end", "0px");
      await viewport.evaluate((element) => element.scrollTo({ left: 0 }));
      await expect(viewport).not.toHaveAttribute("data-overflow-x-start");
      await expect(viewport).toHaveAttribute("data-overflow-x-end");
      await expect(viewport).toHaveCSS("--rf-fade-start", "0px");
      await viewport.hover();
      await page.mouse.wheel(90, 0);
      await expect(viewport).toHaveAttribute("data-overflow-x-start");
      await expect(viewport).toHaveAttribute("data-overflow-x-end");
      await expect(viewport).not.toHaveCSS("mask-image", "none");
      await expect(page.locator(".capture-halo")).toHaveCSS("opacity", "0");
      await page.mouse.move(0, 0);
      await page.screenshot({
        path: testInfo.outputPath(`mobile-scroll-${width}.png`),
      });
      await viewport.evaluate((element) => element.scrollTo({ left: 0 }));
      await viewport.focus();
      const removeLast = page
        .getByRole("group", { exact: true, name: "Screenshot 4" })
        .getByRole("button", { exact: true, name: "Remove" });
      for (let step = 0; step < 16; step++) {
        await page.keyboard.press("Tab");
        if (await removeLast.evaluate((button) => button.matches(":focus"))) {
          break;
        }
      }
      await expect(removeLast).toBeFocused();
      await expect(viewport).toHaveAttribute("data-overflow-x-start");
      await removeLast.press("Enter");
      await expect(page.locator(".screenshot-preview")).toHaveCount(3);
      for (const number of [3, 2]) {
        await page
          .getByRole("group", { exact: true, name: `Screenshot ${number}` })
          .getByRole("button", { exact: true, name: "Remove" })
          .click();
      }
      await expect(page.locator(".screenshot-preview")).toHaveCount(1);
      await expect(viewport).not.toHaveAttribute("data-has-overflow-x");
      await expect(viewport).not.toHaveAttribute("data-overflow-x-start");
      await expect(viewport).not.toHaveAttribute("data-overflow-x-end");
    });
  });
}

test("scrolls the captures with a native touch swipe", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Native touch injection uses Chromium CDP."
  );
  await page.setViewportSize({ height: 844, width: 390 });
  await openWidget(page);
  for (let count = 2; count <= 4; count++) {
    await page
      .getByRole("button", { exact: true, name: "Attach a screenshot" })
      .click();
    await expect(page.locator(".screenshot-preview")).toHaveCount(count);
  }
  const viewport = page.locator(".screenshot-strip");
  await viewport.evaluate((element) => element.scrollTo({ left: 0 }));
  const bounds = await viewport.boundingBox();
  if (!bounds) {
    throw new Error("Screenshot viewport missing");
  }
  const session = await page.context().newCDPSession(page);
  const y = bounds.y + 20;
  const start = bounds.x + bounds.width - 10;
  const end = bounds.x + 10;
  await session.send("Input.dispatchTouchEvent", {
    touchPoints: [{ x: start, y }],
    type: "touchStart",
  });
  for (const progress of [0.2, 0.4, 0.6, 0.8, 1]) {
    await session.send("Input.dispatchTouchEvent", {
      touchPoints: [{ x: start + (end - start) * progress, y }],
      type: "touchMove",
    });
  }
  await session.send("Input.dispatchTouchEvent", {
    touchPoints: [],
    type: "touchEnd",
  });
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  await expect(page.locator(".overlay")).not.toBeVisible();
  await session.detach();
});
