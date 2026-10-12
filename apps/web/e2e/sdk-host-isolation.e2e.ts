import { expect, type Page, test } from "@playwright/test";
import { openWidget } from "./sdk/preview";

async function recordHostKeys(page: Page) {
  await page.evaluate(() => {
    const heard: string[] = [];
    Reflect.set(window, "hostKeys", heard);
    for (const type of ["keydown", "keyup"]) {
      window.addEventListener(type, () => heard.push(type), true);
      document.addEventListener(type, () => heard.push(type));
    }
  });
}

function hostKeys(page: Page) {
  return page.evaluate(() => Reflect.get(window, "hostKeys"));
}

test("keeps keys typed in the widget away from the host page's shortcuts", async ({
  page,
}) => {
  await openWidget(page);
  await recordHostKeys(page);
  const message = page.getByRole("textbox", {
    name: "What would you like to share?",
  });

  await message.click();
  await page.keyboard.type("a b");

  await expect(message).toHaveValue("a b");
  expect(await hostKeys(page)).toEqual([]);

  await page.getByRole("heading", { name: "Plans & billing" }).click();
  await page.keyboard.press("x");
  await expect.poll(() => hostKeys(page)).toContain("keydown");
});
