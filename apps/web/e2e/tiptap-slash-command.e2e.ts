import { expect, test } from "@playwright/test";

const BULLET_LIST_PATTERN = /Bullet List/i;

test.describe("Tiptap Slash Command", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.text().includes("[SlashCommand]")) {
        console.log("BROWSER:", msg.text());
      }
    });

    await page.goto("/test-tiptap");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByTestId("page-title")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("should show slash command menu when typing /", async ({ page }) => {
    const editorContainer = page.getByTestId("editor-container");
    const editor = editorContainer.locator('[contenteditable="true"]');

    await expect(editor).toBeVisible({ timeout: 5000 });

    await editor.click();

    await page.keyboard.type("/");

    const slashMenu = page.getByRole("listbox", { name: "Insert block" });
    await expect(slashMenu).toBeVisible({ timeout: 5000 });

    await expect(slashMenu.getByText("Heading 1")).toBeVisible();
  });

  test("should insert Heading 1 when pressing Enter on first item", async ({
    page,
  }) => {
    const editorContainer = page.getByTestId("editor-container");
    const editor = editorContainer.locator('[contenteditable="true"]');

    await expect(editor).toBeVisible({ timeout: 5000 });

    await editor.click();

    await page.keyboard.type("/");

    const slashMenu = page.getByRole("listbox", { name: "Insert block" });
    await expect(slashMenu).toBeVisible({ timeout: 5000 });

    await page.keyboard.press("Enter");

    await expect(slashMenu).not.toBeVisible({ timeout: 5000 });

    await page.keyboard.type("My Heading");

    const markdownOutput = page.getByTestId("markdown-output");
    await expect(markdownOutput).toContainText("# My Heading", {
      timeout: 5000,
    });
  });

  test("should navigate menu with arrow keys and select with Enter", async ({
    page,
  }) => {
    const editorContainer = page.getByTestId("editor-container");
    const editor = editorContainer.locator('[contenteditable="true"]');

    await expect(editor).toBeVisible({ timeout: 5000 });

    await editor.click();

    await page.keyboard.type("/");

    const slashMenu = page.getByRole("listbox", { name: "Insert block" });
    await expect(slashMenu).toBeVisible({ timeout: 5000 });

    await page.keyboard.press("ArrowDown");

    await page.keyboard.press("Enter");

    await expect(slashMenu).not.toBeVisible({ timeout: 5000 });

    await page.keyboard.type("Subheading");

    const markdownOutput = page.getByTestId("markdown-output");
    await expect(markdownOutput).toContainText("## Subheading", {
      timeout: 5000,
    });
  });

  test("should close menu on Escape", async ({ page }) => {
    const editorContainer = page.getByTestId("editor-container");
    const editor = editorContainer.locator('[contenteditable="true"]');

    await expect(editor).toBeVisible({ timeout: 5000 });

    await editor.click();

    await page.keyboard.type("/");

    const slashMenu = page.getByRole("listbox", { name: "Insert block" });
    await expect(slashMenu).toBeVisible({ timeout: 5000 });

    await page.keyboard.press("Escape");

    await expect(slashMenu).not.toBeVisible({ timeout: 5000 });
  });

  test("should select item by clicking", async ({ page }) => {
    const editorContainer = page.getByTestId("editor-container");
    const editor = editorContainer.locator('[contenteditable="true"]');

    await expect(editor).toBeVisible({ timeout: 5000 });

    await editor.click();

    await page.keyboard.type("/");

    const slashMenu = page.getByRole("listbox", { name: "Insert block" });
    await expect(slashMenu).toBeVisible({ timeout: 5000 });

    await slashMenu.getByRole("option", { name: BULLET_LIST_PATTERN }).click();

    await expect(slashMenu).not.toBeVisible({ timeout: 5000 });

    await page.keyboard.type("List item");

    const markdownOutput = page.getByTestId("markdown-output");
    await expect(markdownOutput).toContainText("- List item", {
      timeout: 5000,
    });
  });

  test("should filter menu items while typing", async ({ page }) => {
    const editorContainer = page.getByTestId("editor-container");
    const editor = editorContainer.locator('[contenteditable="true"]');

    await expect(editor).toBeVisible({ timeout: 5000 });

    await editor.click();

    await page.keyboard.type("/head");

    const slashMenu = page.getByRole("listbox", { name: "Insert block" });
    await expect(slashMenu).toBeVisible({ timeout: 5000 });

    await expect(slashMenu.getByText("Heading 1")).toBeVisible();
    await expect(slashMenu.getByText("Heading 2")).toBeVisible();
    await expect(slashMenu.getByText("Heading 3")).toBeVisible();

    await expect(slashMenu.getByText("Bullet List")).not.toBeVisible();
  });
});
