import { expect, type Locator, type Page, test } from "@playwright/test";

const SECTION_HEADINGS = [/Listen closely/, /Feedback that/, /Before you/];

test("cursor ripples spread and settle while the pointer rests", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const timeUniforms = new WeakSet<WebGLUniformLocation>();
    const findUniform = WebGLRenderingContext.prototype.getUniformLocation;
    const setFloat = WebGLRenderingContext.prototype.uniform1f;
    WebGLRenderingContext.prototype.getUniformLocation =
      function getUniformLocation(program, name) {
        const location = findUniform.call(this, program, name);
        if (location && name === "time") {
          timeUniforms.add(location);
        }
        return location;
      };
    WebGLRenderingContext.prototype.uniform1f = function uniform1f(
      location,
      value
    ) {
      setFloat.call(
        this,
        location,
        location && timeUniforms.has(location) ? 0 : value
      );
    };
  });
  await page.goto("/");
  const canvas = page.locator(".hero-reflection-canvas");
  await expect(page.locator(".hero-reflection")).toHaveAttribute(
    "data-renderer",
    "webgl"
  );
  await expect(page.locator(".hero-product-scene")).toHaveCSS("opacity", "1");
  const before = await canvas.screenshot();
  await canvas.hover({ force: true, position: { x: 180, y: 60 } });
  await expect
    .poll(async () => before.equals(await canvas.screenshot()))
    .toBe(false);
  const disturbed = await canvas.screenshot();
  await page.waitForTimeout(350);
  expect(disturbed.equals(await canvas.screenshot())).toBe(false);
  await expect
    .poll(async () => before.equals(await canvas.screenshot()), {
      timeout: 8000,
    })
    .toBe(true);
});

test("the tall hero places the product and its reflection beside the copy", async ({
  page,
}) => {
  await page.setViewportSize({ height: 1000, width: 1440 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".hero-product-preview")).toBeVisible();
  await expect(page.locator(".hero-reflection")).toBeVisible();
  await expect(async () => {
    const bounds = await page.locator(".marketing-hero").evaluate((hero) => {
      const heading = hero.querySelector("h1");
      const preview = hero.querySelector(".hero-product-preview");
      const reflection = hero.querySelector(".hero-reflection");
      if (!(heading && preview && reflection)) {
        throw new Error("Hero composition missing");
      }
      const headlineBounds = heading.getBoundingClientRect();
      const previewBounds = preview.getBoundingClientRect();
      return {
        headingRight: headlineBounds.right,
        headingWidth: headlineBounds.width,
        heroHeight: hero.getBoundingClientRect().height,
        previewBottom: previewBounds.bottom,
        previewLeft: previewBounds.left,
        reflectionTop: reflection.getBoundingClientRect().top,
      };
    });
    expect(bounds.heroHeight).toBeGreaterThanOrEqual(900);
    expect(bounds.heroHeight).toBeLessThan(930);
    expect(bounds.headingWidth).toBeGreaterThan(0);
    expect(bounds.headingRight).toBeLessThanOrEqual(bounds.previewLeft);
    expect(bounds.reflectionTop).toBeGreaterThanOrEqual(
      bounds.previewBottom - 2
    );
  }).toPass({ timeout: 5000 });
  await page.setViewportSize({ height: 844, width: 390 });
  await expect(page.locator(".hero-product-preview")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
});

function countReflectionDraws() {
  const draw = WebGLRenderingContext.prototype.drawArrays;
  WebGLRenderingContext.prototype.drawArrays = function drawArrays(
    mode,
    first,
    count
  ) {
    if (this.canvas instanceof HTMLCanvasElement) {
      const previous = Number(this.canvas.dataset.drawCount ?? 0);
      this.canvas.dataset.drawCount = String(previous + 1);
    }
    draw.call(this, mode, first, count);
  };
}

async function expectPaused(page: Page, canvas: Locator) {
  await page.waitForTimeout(200);
  const drawCount = await canvas.getAttribute("data-draw-count");
  await page.waitForTimeout(300);
  await expect(canvas).toHaveAttribute("data-draw-count", String(drawCount));
}

test("the shader pauses when unused and survives context loss", async ({
  page,
}) => {
  await page.addInitScript(countReflectionDraws);
  await page.goto("/");
  const reflection = page.locator(".hero-reflection");
  const canvas = page.locator(".hero-reflection-canvas");
  await expect(reflection).toHaveAttribute("data-renderer", "webgl");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expectPaused(page, canvas);
  const pausedFrames = Number(await canvas.getAttribute("data-draw-count"));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-draw-count")))
    .toBeGreaterThan(pausedFrames + 2);
  await page.locator(".marketing-faq").scrollIntoViewIfNeeded();
  await expectPaused(page, canvas);
  await canvas.evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) {
      throw new Error("Reflection canvas missing");
    }
    const extension = element
      .getContext("webgl")
      ?.getExtension("WEBGL_lose_context");
    if (!extension) {
      throw new Error("Context loss extension unavailable");
    }
    extension.loseContext();
  });
  await expect(reflection).toHaveAttribute("data-renderer", "fallback");
  await expect(page.locator(".hero-reflection-fallback")).toBeVisible();
});

test("the hero keeps a reflection and working links without WebGL", async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto("/");
  await expect(page.locator(".hero-reflection")).toHaveAttribute(
    "data-renderer",
    "fallback"
  );
  await expect(page.locator(".hero-reflection-fallback")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Listen closely.Build what matters."
  );
  await page
    .getByRole("link", { exact: true, name: "Explore the feedback loop" })
    .click();
  await expect(page.getByTestId("feedback-journey")).toHaveAttribute(
    "data-step",
    "capture"
  );
});

test("the marketing sections stay readable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  for (const name of SECTION_HEADINGS) {
    const heading = page.getByRole("heading", { name });
    await expect(heading).toBeVisible();
    await expect(heading).toHaveCSS("opacity", "1");
  }
  await context.close();
});
