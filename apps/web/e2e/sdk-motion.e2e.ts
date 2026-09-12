import { expect, test } from "@playwright/test";
import { openWidget } from "./sdk/preview";

test.use({
  video: { mode: "on", size: { height: 1000, width: 1440 } },
  viewport: { height: 1000, width: 1440 },
});

test("keeps the lower right corner anchored while expanding and minimizing a moved composer", async ({
  page,
}) => {
  await openWidget(page);
  const opened = await page.locator(".root").boundingBox();
  expect(opened && opened.x + opened.width).toBeCloseTo(1420, 0);
  const move = page.getByRole("button", { name: "Move feedback" });
  await move.press("ArrowLeft");
  const initial = await page.locator(".root").boundingBox();
  if (!initial) {
    throw new Error("Widget missing");
  }
  const right = initial.x + initial.width;
  const bottom = initial.y + initial.height;
  await page
    .getByRole("textbox", { name: "What would you like to share?" })
    .fill("Keep this draft attached to the same corner.");
  await expect(async () => {
    const expanded = await page.locator(".root").boundingBox();
    if (!expanded) {
      throw new Error("Widget missing");
    }
    expect(expanded.height).toBeGreaterThan(initial.height);
    expect(expanded.y + expanded.height).toBeCloseTo(bottom, 0);
    expect(expanded.x + expanded.width).toBeCloseTo(right, 0);
  }).toPass();
  await page.getByRole("button", { name: "Minimize feedback" }).click();
  const collapsed = await page
    .getByRole("button", { name: "Resume feedback" })
    .boundingBox();
  if (!collapsed) {
    throw new Error("Launcher missing");
  }
  expect(collapsed.x + collapsed.width).toBeCloseTo(right, 0);
  expect(collapsed.y + collapsed.height).toBeCloseTo(bottom, 0);
});

test("returns the editor to its thumbnail and restores keyboard focus", async ({
  page,
}) => {
  await openWidget(page);
  const thumbnail = page.locator(".screenshot-preview");
  await thumbnail.click();
  const editor = page.locator(".overlay");
  await expect(editor).toHaveAttribute("data-opening", "false");
  await page.getByRole("button", { exact: true, name: "Arrow" }).click();
  await page.getByRole("button", { exact: true, name: "Done" }).click();
  await expect(editor).not.toBeVisible();
  await expect(thumbnail).toBeFocused();
  await thumbnail.press("Enter");
  await expect(editor).toHaveAttribute("data-opening", "false");
  await page.keyboard.press("Escape");
  await expect(editor).not.toBeVisible();
  await expect(thumbnail).toBeFocused();
});
