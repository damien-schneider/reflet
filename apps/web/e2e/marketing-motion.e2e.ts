import { expect, type Locator, test } from "@playwright/test";

async function placeInViewport(target: Locator, viewportTop: number) {
  await target.evaluate((element, top) => {
    window.scrollTo({
      behavior: "instant",
      top: window.scrollY + element.getBoundingClientRect().top - top,
    });
  }, viewportTop);
}

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
  const group = page.locator(".marketing-faq > div").first();
  await placeInViewport(group, 700);
  await expect(group.getByRole("heading")).toHaveCSS("translate", "none");
  await page.getByRole("button", { exact: true, name: "Monthly" }).click();
  await expect(page.getByTestId("pro-price")).toContainText("€15");
});

test("navigation links show their underline on keyboard focus", async ({
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
});

test("the hero uses one typeface and its story links change the reflected cards", async ({
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
  const storyLinks = page.getByRole("navigation", {
    name: "Your feedback loop",
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
  const planLink = storyLinks.getByRole("link", {
    name: "02 Plan in the open",
  });
  await planLink.hover();
  await expect(planLink).toHaveAttribute("data-active", "true");
  await expect
    .poll(async () => before.equals(await canvasPixels()))
    .toBe(false);
  await storyLinks
    .getByRole("link", { name: "01 Collect ideas where they happen" })
    .focus();
  await expect.poll(async () => before.equals(await canvasPixels())).toBe(true);
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
