import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";
import tailwind from "@tailwindcss/postcss";
import postcss from "postcss";

const buildDirectory = mkdtempSync(
  path.join(tmpdir(), "reflet-feedback-loading-")
);
let stylesheet: string;
let script: string;

test.beforeAll(async () => {
  execFileSync("bun", [
    "build",
    "e2e/fixtures/feedback-loading.tsx",
    "--outdir",
    buildDirectory,
    "--target",
    "browser",
  ]);
  script = readFileSync(
    path.join(buildDirectory, "feedback-loading.js"),
    "utf8"
  );
  const cssPath = path.resolve("app/globals.css");
  const result = await postcss([tailwind()]).process(
    readFileSync(cssPath, "utf8"),
    { from: cssPath }
  );
  stylesheet = result.css;
});

test.afterAll(() => rmSync(buildDirectory, { force: true, recursive: true }));

test.beforeEach(async ({ page }) => {
  await page.route("http://feedback.test/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/fixture.js") {
      return route.fulfill({
        body: script,
        contentType: "application/javascript",
      });
    }
    if (url.pathname === "/fixture.css") {
      return route.fulfill({ body: stylesheet, contentType: "text/css" });
    }
    return route.fulfill({
      body: '<!doctype html><html class="dark" data-skin="refined" data-theme="reflet"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>',
      contentType: "text/html",
    });
  });
});

for (const width of [390, 1440]) {
  for (const collapsed of [false, true]) {
    test(`feedback loading at ${width}px with sidebar ${collapsed ? "collapsed" : "expanded"} uses the available page width`, async ({
      page,
    }) => {
      await page.setViewportSize({ height: 1000, width });
      await page.goto(`http://feedback.test/?collapsed=${collapsed}`);
      const loading = page
        .getByRole("status")
        .filter({ hasText: "Loading feedback" });
      await expect(loading).toBeAttached();
      const loadingBounds = await page
        .locator('[aria-busy="true"]')
        .boundingBox();
      const mainBounds = await page.getByRole("main").boundingBox();
      if (!(loadingBounds && mainBounds)) {
        throw new Error("Missing feedback bounds");
      }
      expect(loadingBounds.width).toBeGreaterThanOrEqual(
        Math.min(768, mainBounds.width - 40)
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth)
      ).toBe(width);
      await page.screenshot({
        path: test.info().outputPath("feedback-loading.png"),
      });
      const title = page.getByRole("heading", {
        exact: true,
        name: "Feedback",
      });
      const titleBounds = await title.boundingBox();
      await page.getByRole("button", { name: "Toggle loading" }).click();
      await expect(page.getByRole("article")).toBeVisible();
      const loadedBounds = await page.getByRole("article").boundingBox();
      if (!loadedBounds) {
        throw new Error("Missing loaded feedback bounds");
      }
      expect(loadedBounds.x).toBe(loadingBounds.x);
      expect(loadedBounds.width).toBe(loadingBounds.width);
      const loadedTitleBounds = await title.boundingBox();
      if (!(titleBounds && loadedTitleBounds)) {
        throw new Error("Missing feedback title bounds");
      }
      expect(loadedTitleBounds.x).toBe(titleBounds.x);
      expect(loadedTitleBounds.y).toBe(titleBounds.y);
      expect(loadedBounds.y).toBe(loadingBounds.y);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth)
      ).toBe(width);
    });
  }
}

for (const width of [390, 1440]) {
  test(`public loading and private feedback at ${width}px keep the same readable measure`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 1000, width });
    await page.goto("http://feedback.test/?public");
    const loadingBounds = await page
      .locator('[aria-busy="true"]')
      .boundingBox();
    if (!loadingBounds) {
      throw new Error("Missing public loading bounds");
    }
    expect(loadingBounds.width).toBe(Math.min(768, width - 40));
    await page.goto("http://feedback.test/?public&private");
    await expect(page.getByText("This board is private")).toBeVisible();
    const contentBounds = await page
      .locator('[data-control-family="page-layout"][data-slot="content"]')
      .boundingBox();
    if (!contentBounds) {
      throw new Error("Missing private feedback bounds");
    }
    expect(contentBounds.width).toBe(loadingBounds.width);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth)
    ).toBe(width);
  });
}

for (const view of ["Board", "Milestones"]) {
  test(`${view} keeps its wider measure through loading`, async ({ page }) => {
    await page.setViewportSize({ height: 1000, width: 1440 });
    await page.goto("http://feedback.test/");
    await page.getByRole("button", { name: "Toggle loading" }).click();
    await page.getByRole("tab", { exact: true, name: view }).click();
    const loadedBounds = await page.getByRole("article").boundingBox();
    if (!loadedBounds) {
      throw new Error("Missing wide feedback bounds");
    }
    expect(loadedBounds.width).toBeGreaterThan(768);
    await page.getByRole("button", { name: "Toggle loading" }).click();
    const loadingBounds = await page
      .locator('[aria-busy="true"]')
      .boundingBox();
    if (!loadingBounds) {
      throw new Error("Missing wide loading bounds");
    }
    expect(loadingBounds.width).toBe(loadedBounds.width);
    expect(loadingBounds.x).toBe(loadedBounds.x);
    expect(loadingBounds.y).toBe(loadedBounds.y);
  });
}
