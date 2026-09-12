import { expect, test } from "@playwright/test";

test("one request travels from feedback to an in-app release", async ({
  page,
}) => {
  const buttonWarnings: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("expected a native <button>")) {
      buttonWarnings.push(message.text());
    }
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Listen closely.Build what matters."
  );
  const structuredData = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  expect(structuredData.join(" ")).toContain('"priceCurrency":"EUR"');
  expect(structuredData.join(" ")).toContain(
    "Does AI make decisions for my team?"
  );
  const story = page.getByTestId("feedback-journey");
  const request = page.getByTestId("journey-request");
  const originalRequest = await request.elementHandle();
  for (const step of [
    "capture",
    "board",
    "ai",
    "planned",
    "done",
    "release",
    "notify",
  ]) {
    await story.locator(`a[href="#journey-${step}"]`).click();
    await expect(story).toHaveAttribute("data-step", step);
    await expect(request).toBeVisible();
    expect(
      await request.evaluate(
        (element, original) => element === original,
        originalRequest
      )
    ).toBe(true);
  }
  await expect(
    story.getByText("You asked. We shipped.", { exact: true })
  ).toBeVisible();
  await story.locator('a[href="#journey-board"]').click();
  await expect(story).toHaveAttribute("data-step", "board");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
  expect(buttonWarnings).toEqual([]);
});

test("the whole request and navigation fit on a compact phone", async ({
  page,
}) => {
  await page.goto("/");
  const story = page.getByTestId("feedback-journey");
  for (const width of [390, 320]) {
    await page.setViewportSize({ height: 667, width });
    for (const step of [
      "capture",
      "ai",
      "planned",
      "done",
      "release",
      "notify",
    ]) {
      await story.locator(`a[href="#journey-${step}"]`).click();
      await expect(story).toHaveAttribute("data-step", step);
      await expect
        .poll(() =>
          story.evaluate((element) => {
            const request = element.querySelector(".journey-request");
            const body = element.querySelector(".journey-scene-body");
            if (!(request && body)) {
              throw new Error("Story scene missing");
            }
            return (
              request.getBoundingClientRect().bottom -
              body.getBoundingClientRect().bottom
            );
          })
        )
        .toBeLessThanOrEqual(1);
      const navigation = await story.getByRole("navigation").boundingBox();
      const linkBounds = await story
        .getByRole("navigation")
        .getByRole("link")
        .evaluateAll((links) =>
          links.map((link) => link.getBoundingClientRect().right)
        );
      expect(Math.max(...linkBounds)).toBeLessThanOrEqual(width);
      expect(
        navigation && navigation.y + navigation.height
      ).toBeLessThanOrEqual(667);
    }
  }
});

test("mobile journey links stay in place when the active chapter changes", async ({
  page,
}) => {
  await page.setViewportSize({ height: 667, width: 320 });
  await page.goto("/");
  const story = page.getByTestId("feedback-journey");
  const links = story.getByRole("navigation").getByRole("link");
  await links.first().press("Enter");
  await expect(story).toHaveAttribute("data-step", "capture");
  const originalCenters = await links.evaluateAll((elements) =>
    elements.map((element) => {
      const { x, width } = element.getBoundingClientRect();
      return x + width / 2;
    })
  );
  for (const step of ["ai", "planned", "release", "notify", "capture"]) {
    await story.locator(`a[href="#journey-${step}"]`).press("Enter");
    await expect(story).toHaveAttribute("data-step", step);
    const centers = await links.evaluateAll((elements) =>
      elements.map((element) => {
        const { x, width } = element.getBoundingClientRect();
        return x + width / 2;
      })
    );
    for (const [index, center] of centers.entries()) {
      expect(Math.abs(center - originalCenters[index])).toBeLessThan(1);
    }
  }
});

test("reduced motion keeps every story step accessible without a long scroll", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const story = page.getByTestId("feedback-journey");
  await expect(story).toHaveAttribute("data-reduced-motion", "true");
  expect(
    await story.evaluate((element) => element.getBoundingClientRect().height)
  ).toBeLessThan(1400);
  await story.locator('a[href="#journey-notify"]').click();
  await expect(story).toHaveAttribute("data-step", "notify");
  await expect(
    story.getByText("You asked. We shipped.", { exact: true })
  ).toBeVisible();
  await expect(page.locator(".marketing-billing-indicator")).toHaveCSS(
    "transition-duration",
    "0s"
  );
});

test("the request moves continuously between planned and done", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByTestId("feedback-journey")
    .locator('a[href="#journey-planned"]')
    .click();
  const story = page.getByTestId("feedback-journey");
  await expect(story).toHaveAttribute("data-step", "planned");
  await expect
    .poll(() =>
      story.locator('.journey-surface[data-chapter="ai"]').evaluate((panel) => {
        const scene = panel.closest(".journey-scene-body");
        if (!scene) {
          throw new Error("Story scene missing");
        }
        return (
          panel.getBoundingClientRect().right -
          scene.getBoundingClientRect().left
        );
      })
    )
    .toBeLessThanOrEqual(1);
  const request = page.getByTestId("journey-request");
  await expect
    .poll(() => request.evaluate((element) => element.style.left))
    .toBe("36%");
  const planned = await request.boundingBox();
  await page
    .getByTestId("feedback-journey")
    .locator('a[href="#journey-done"]')
    .click();
  await expect(story).toHaveAttribute("data-step", "done");
  await expect
    .poll(() => request.evaluate((element) => element.style.left))
    .toBe("67%");
  const done = await request.boundingBox();
  await page
    .getByTestId("feedback-journey")
    .locator('a[href="#journey-planned"]')
    .click();
  await expect(story).toHaveAttribute("data-step", "planned");
  if (!(planned && done)) {
    throw new Error("Request position unavailable");
  }
  await page.evaluate(() => window.scrollBy(0, window.innerHeight / 2));
  await expect
    .poll(async () => (await request.boundingBox())?.x)
    .toBeGreaterThan(planned.x);
  await expect
    .poll(async () => (await request.boundingBox())?.x)
    .toBeLessThan(done.x);
});

test("mobile homepage and pricing use the actual billing plans", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
  for (const path of ["/", "/pricing"]) {
    if (path !== "/") {
      await page.goto(path);
    }
    const pricing = page.getByTestId("marketing-pricing");
    await expect(
      pricing.getByRole("heading", { exact: true, name: "Free" })
    ).toBeVisible();
    await expect(
      pricing.getByRole("heading", { exact: true, name: "Pro" })
    ).toBeVisible();
    await pricing.getByRole("button", { exact: true, name: "Monthly" }).click();
    await expect(pricing.getByTestId("pro-price")).toContainText("€15");
    await pricing.getByRole("button", { exact: true, name: "Yearly" }).click();
    await expect(pricing.getByTestId("pro-price")).toContainText("€12.50");
    await expect(
      pricing.getByText("€150 billed yearly", { exact: true })
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true);
  }
});
