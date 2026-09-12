import { expect, type Locator, test } from "@playwright/test";

const CHAPTER_STEPS = [
  "capture",
  "board",
  "ai",
  "planned",
  "done",
  "release",
  "notify",
];

async function scrollToChapter(story: Locator, chapter: number) {
  await story.evaluate((element, position) => {
    const top = element.getBoundingClientRect().top + window.scrollY;
    const travel = element.getBoundingClientRect().height - window.innerHeight;
    window.scrollTo({
      behavior: "instant",
      top: top + (travel * position) / 6,
    });
  }, chapter);
  await expect(story).toHaveAttribute(
    "data-step",
    CHAPTER_STEPS[Math.round(chapter)]
  );
}

async function inspectScenePanels(story: Locator) {
  return await story.locator(".journey-scene-body").evaluate((scene) => {
    const viewport = scene.getBoundingClientRect();
    const panels = [...scene.querySelectorAll(".journey-surface")]
      .map((panel) => {
        const bounds = panel.getBoundingClientRect();
        return {
          left: Math.max(viewport.left, bounds.left),
          opacity: Number(getComputedStyle(panel).opacity),
          right: Math.min(viewport.right, bounds.right),
        };
      })
      .filter((panel) => panel.right - panel.left > 1 && panel.opacity > 0);
    return {
      overlapping: panels.some((panel, index) =>
        panels
          .slice(index + 1)
          .some(
            (nextPanel) =>
              Math.min(panel.right, nextPanel.right) -
                Math.max(panel.left, nextPanel.left) >
              1
          )
      ),
      translucent: panels.some((panel) => panel.opacity < 1),
      visible: panels.length,
    };
  });
}

for (const width of [1440, 320]) {
  test(`story chapters stay opaque and separate while scrolling at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: width === 320 ? 667 : 900, width });
    await page.goto("/");
    const story = page.getByTestId("feedback-journey");
    await story.locator('a[href="#journey-capture"]').click();
    for (const chapter of [0.4, 1.4, 2.4, 4.4, 5.4, 4.4, 2.4, 0.4]) {
      await scrollToChapter(story, chapter);
      await expect
        .poll(() => inspectScenePanels(story))
        .toEqual({
          overlapping: false,
          translucent: false,
          visible: 2,
        });
      await expect(page.getByTestId("journey-request")).toHaveCSS(
        "opacity",
        "1"
      );
      await expect(story.locator(".journey-step-copy")).toHaveCSS(
        "opacity",
        "1"
      );
    }
  });
}

test("each chapter has a reading pause before the next handoff", async ({
  page,
}) => {
  await page.goto("/");
  const story = page.getByTestId("feedback-journey");
  await story.locator('a[href="#journey-capture"]').click();
  for (const chapter of [0.08, 0.92, 1.08, 4.92, 5.08, 0.08]) {
    await scrollToChapter(story, chapter);
    await expect
      .poll(() => inspectScenePanels(story))
      .toEqual({
        overlapping: false,
        translucent: false,
        visible: 1,
      });
  }
});
