import { expect, test } from "@playwright/test";
import { openWidget } from "./preview";

for (const viewport of [
  { height: 1000, width: 1440 },
  { height: 844, width: 390 },
]) {
  test(`capture halo follows the square viewport at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openWidget(page);
    const halo = page.locator(".capture-halo");
    await expect(halo).toHaveCSS("pointer-events", "none");
    expect(await halo.boundingBox()).toEqual({
      ...viewport,
      x: 0,
      y: 0,
    });
    for (const pseudoElement of ["::before", "::after"]) {
      const cornerRadii = await halo.evaluate((element, pseudo) => {
        const style = getComputedStyle(element, pseudo);
        return [
          style.borderTopLeftRadius,
          style.borderTopRightRadius,
          style.borderBottomRightRadius,
          style.borderBottomLeftRadius,
        ];
      }, pseudoElement);
      expect(cornerRadii).toEqual(["0px", "0px", "0px", "0px"]);
    }
  });
}
