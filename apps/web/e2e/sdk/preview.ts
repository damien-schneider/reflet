import { expect, type Page } from "@playwright/test";

export async function openWidget(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem("cookie-consent", "rejected")
  );
  await page.goto("/sdk-demo");
  await expect(
    page.getByRole("heading", { name: "Plans & billing" })
  ).toBeVisible();
  await page.getByRole("button", { exact: true, name: "Feedback" }).click();
  await expect(page.locator(".screenshot-preview")).toBeVisible({
    timeout: 20_000,
  });
  await page.mouse.move(0, 0);
}

export async function drawSpotlight(page: Page, screenshotIndex = 0) {
  await page.locator(".annotate-action").nth(screenshotIndex).click();
  await expect(page.locator(".overlay")).toHaveAttribute(
    "data-opening",
    "false"
  );
  await page.getByLabel("More drawing tools", { exact: true }).click();
  await page.getByRole("button", { exact: true, name: "Spotlight" }).click();
  const bounds = await page.locator(".editor canvas").boundingBox();
  if (!bounds) {
    throw new Error("Annotation canvas missing");
  }
  const plan = await page.locator("#plan > div").first().boundingBox();
  const viewport = page.viewportSize();
  if (!(plan && viewport)) {
    throw new Error("Plan card missing");
  }
  await page.mouse.move(
    bounds.x + (plan.x / viewport.width) * bounds.width,
    bounds.y + (plan.y / viewport.height) * bounds.height
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + ((plan.x + plan.width) / viewport.width) * bounds.width,
    bounds.y + ((plan.y + plan.height) / viewport.height) * bounds.height,
    { steps: 8 }
  );
  await page.mouse.up();
  await expect(
    page.getByRole("button", { exact: true, name: "Undo" })
  ).toBeEnabled();
}

export async function expectWidgetInViewport(page: Page) {
  await expect(async () => {
    const bounds = await page.locator(".root").boundingBox();
    const viewport = page.viewportSize();
    if (!(bounds && viewport)) {
      throw new Error("Widget missing");
    }
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
  }).toPass();
}
