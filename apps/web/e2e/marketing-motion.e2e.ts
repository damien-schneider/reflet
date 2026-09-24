import { expect, type Locator, test } from "@playwright/test";

async function placeInViewport(target: Locator, viewportTop: number) {
  await target.evaluate((element, top) => {
    window.scrollTo({
      behavior: "instant",
      top: window.scrollY + element.getBoundingClientRect().top - top,
    });
  }, viewportTop);
}

async function readOpacity(target: Locator) {
  return Number(
    await target.evaluate((element) => getComputedStyle(element).opacity)
  );
}

async function expectArrival(target: Locator) {
  await expect.poll(() => readOpacity(target)).toBeLessThan(0.95);
  await expect(target).toHaveCSS("opacity", "1");
}

test("homepage sections replay their entrance from both scroll directions", async ({
  page,
}) => {
  await page.setViewportSize({ height: 1000, width: 1440 });
  await page.goto("/");
  const group = page.locator(".marketing-features .marketing-section-intro");
  const heading = group.getByRole("heading");
  await placeInViewport(group, 1100);
  await page.waitForTimeout(150);
  await placeInViewport(group, 350);
  await expectArrival(heading);
  await placeInViewport(group, 200);
  await expect(heading).toHaveCSS("opacity", "1");
  for (const outsideTop of [-600, 1100]) {
    await placeInViewport(group, outsideTop);
    await page.waitForTimeout(150);
    await placeInViewport(group, 350);
    await expectArrival(heading);
  }
  await page.evaluate(() => window.scrollTo({ behavior: "instant", top: 0 }));
  await expectArrival(page.locator(".marketing-hero h1 > :first-child"));
});

test("feature choices preserve layout and the user's draft", async ({
  page,
}) => {
  await page.goto("/");
  for (const width of [1440, 900, 390, 320]) {
    await page.setViewportSize({ height: 1000, width });
    const explorer = page.locator(".feature-explorer");
    const choices = page.getByRole("group", {
      name: "Explore Reflet features",
    });
    await choices
      .getByRole("button", { name: "Collect in the moment" })
      .click();
    await page.getByLabel("Your idea").fill("Keep my filters");
    const height = await explorer.evaluate(
      (element) => element.getBoundingClientRect().height
    );
    for (const name of [
      "Plan with context",
      "Close the loop",
      "Collect in the moment",
    ]) {
      await choices.getByRole("button", { name }).click();
      expect(
        await explorer.evaluate(
          (element) => element.getBoundingClientRect().height
        )
      ).toBeCloseTo(height, 0);
    }
    await expect(page.getByLabel("Your idea")).toHaveValue("Keep my filters");
  }
});

test("reduced motion keeps content still and billing immediately usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/pricing");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveCSS("opacity", "1");
  const group = page.locator(".marketing-faq > [data-reveal]").first();
  await placeInViewport(group, 700);
  await expect(group.getByRole("heading")).toHaveCSS("translate", "none");
  await page.getByRole("button", { exact: true, name: "Monthly" }).click();
  await expect(page.getByTestId("pro-price")).toContainText("€15");
});

test("navigation responds to keyboard focus and cards respond to hover", async ({
  page,
}) => {
  await page.goto("/pricing");
  const pricingLink = page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Pricing" });
  await pricingLink.focus();
  await expect
    .poll(() =>
      pricingLink.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element, "::after").scale)
      )
    )
    .toBe(1);
  const card = page.locator('.marketing-plan[data-plan="pro"]');
  await card.hover();
  await expect(card).toHaveCSS("translate", "0px -3px");
  await page.mouse.move(0, 0);
  await expect(card).toHaveCSS("translate", "0px");
});

test("the hero uses one typeface and its controls change the reflected cards", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const heading = page.getByRole("heading", { level: 1 });
  const fontFamily = await heading.evaluate(
    (element) => getComputedStyle(element).fontFamily
  );
  await expect(heading.locator(":scope > :first-child")).toHaveCSS(
    "font-family",
    fontFamily
  );
  const controls = page.getByRole("group", {
    name: "Explore the product preview",
  });
  const canvas = page.locator(".hero-reflection-canvas");
  const canvasPixels = () =>
    canvas.screenshot({ style: "[data-reflet-widget] { display: none; }" });
  await expect(page.locator(".hero-reflection")).toHaveAttribute(
    "data-renderer",
    "webgl"
  );
  await expect(page.locator(".hero-product-scene")).toHaveCSS("opacity", "1");
  const before = await canvasPixels();
  await controls.getByRole("button", { exact: true, name: "Planned" }).click();
  await expect(
    controls.getByRole("button", { exact: true, name: "Planned" })
  ).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(async () => before.equals(await canvasPixels()))
    .toBe(false);
  await controls.getByRole("button", { exact: true, name: "An idea" }).click();
  await expect.poll(async () => before.equals(await canvasPixels())).toBe(true);
});

test("the closing reflection follows the pointer and respects reduced motion", async ({
  page,
}) => {
  await page.goto("/");
  const closing = page.locator(".marketing-closing");
  const mark = closing.locator(".closing-reflection-source");
  await closing.scrollIntoViewIfNeeded();
  const restingTransform = await mark.evaluate(
    (element) => getComputedStyle(element).transform
  );
  await closing.hover({ position: { x: 50, y: 50 } });
  await expect
    .poll(() => mark.evaluate((element) => getComputedStyle(element).transform))
    .not.toBe(restingTransform);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(mark).toHaveCSS("transform", "none");
  await expect(
    closing.getByRole("link", { name: "Start collecting feedback" })
  ).toHaveAttribute("href", "/dashboard");
});

test("reduced motion survives hydration and live preference changes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const journey = page.getByTestId("feedback-journey");
  await expect(journey).toHaveAttribute("data-reduced-motion", "true");
  expect(errors).toEqual([]);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(journey).toHaveAttribute("data-reduced-motion", "false");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(journey).toHaveAttribute("data-reduced-motion", "true");
  expect(errors).toEqual([]);
});
