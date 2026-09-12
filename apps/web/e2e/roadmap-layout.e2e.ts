import { expect, test } from "@playwright/test";
import {
  createOrganization,
  makeOrgName,
  makeTestUser,
  signUpAndLandOnDashboard,
} from "./helpers/auth";

test("roadmap columns stay side by side and scroll within the board", async ({
  page,
}) => {
  await signUpAndLandOnDashboard(page, makeTestUser("roadmap-layout"));
  const slug = await createOrganization(page, makeOrgName("Roadmap Layout"));
  await page.goto(`/dashboard/${slug}?view=roadmap`);

  const roadmap = page.getByRole("region", { name: "Roadmap columns" });
  await expect(roadmap).toBeVisible({ timeout: 15_000 });

  for (const width of [1280, 390]) {
    await page.setViewportSize({ height: 844, width });
    const columns = roadmap.locator("[data-dragging]");
    await expect(columns.first()).toBeVisible();
    const bounds = await columns.evaluateAll((elements) =>
      elements.map((element) => {
        const { x, y, width: columnWidth } = element.getBoundingClientRect();
        return { width: columnWidth, x, y };
      })
    );

    expect(bounds.length).toBeGreaterThan(1);
    expect(Math.max(...bounds.map(({ y }) => y)) - bounds[0].y).toBeLessThan(1);
    for (let index = 1; index < bounds.length; index += 1) {
      expect(bounds[index].x).toBeGreaterThanOrEqual(
        bounds[index - 1].x + bounds[index - 1].width
      );
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`roadmap-${width}.png`),
    });
  }

  const addColumn = roadmap.getByRole("button", { name: "Add Column" });
  await addColumn.focus();
  await expect(addColumn).toBeFocused();
  expect(
    await roadmap.evaluate((element) => element.scrollLeft)
  ).toBeGreaterThan(0);
});
