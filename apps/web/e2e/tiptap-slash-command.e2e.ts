import { expect, test } from "@playwright/test";

// Regex patterns used in tests - defined at top level for performance
const BULLET_LIST_PATTERN = /Bullet List/i;

/**
 * E2E tests for TiptapMarkdownEditor slash commands.
 * These tests verify that:
 * 1. Typing "/" triggers the slash command menu
 * 2. Pressing Enter selects the first item (Heading 1)
 * 3. The editor content is updated with the correct formatting
 */
test.describe("Tiptap Slash Command", () => {
  test.beforeEach(async ({ page }) => {
    // Capture console logs for debugging
    page.on("console", (msg) => {
      if (msg.text().includes("[SlashCommand]")) {
        console.log("BROWSER:", msg.text());
      }
    });

    // Navigate to the test page
    await page.goto("/test-tiptap");
    await page.waitForLoadState("domcontentloaded");

    // Wait for the page to be ready
    await expect(page.getByTestId("page-title")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("should show slash command menu when typing /", async ({ page }) => {
    // Find the editor - it's a contenteditable div inside the editor container
    const editorContainer = page.getByTestId("editor-container");
    const editor = editorContainer.locator('[contenteditable="true"]');

    await expect(editor).toBeVisible({ timeout: 5000 });

    // Click to focus the editor
    await editor.click();

    // Type "/" to trigger slash command menu
    await page.keyboard.type("/");

    // Wait for the slash command menu to appear
    const slashMenu = page.locator('[data-slot="slash-command-menu"]');
    await expect(slashMenu).toBeVisible({ timeout: 5000 });

    // Should show "Heading 1" as the first option
    await expect(slashMenu.getByText("Heading 1")).toBeVisible();
  });

  test("should insert Heading 1 when pressing Enter on first item", async ({
    page,
  }) => {
    const editorContainer = page.getByTestId("editor-container");
    const editor = editorContainer.locator('[contenteditable="true"]');

    await expect(editor).toBeVisible({ timeout: 5000 });

    // Focus the editor
    await editor.click();

    // Type "/" to trigger slash command menu
    await page.keyboard.type("/");

    // Wait for the slash command menu to appear
    const slashMenu = page.locator('[data-slot="slash-command-menu"]');
    await expect(slashMenu).toBeVisible({ timeout: 5000 });

    // Press Enter to select the first item (Heading 1)
    await page.keyboard.press("Enter");

    // Wait for the menu to close
    await expect(slashMenu).not.toBeVisible({ timeout: 5000 });

    // Type some text for the heading
    await page.keyboard.type("My Heading");

    // Verify the markdown output contains the heading
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

    // Focus the editor
    await editor.click();

    // Type "/" to trigger slash command menu
    await page.keyboard.type("/");

    // Wait for the slash command menu to appear
    const slashMenu = page.locator('[data-slot="slash-command-menu"]');
    await expect(slashMenu).toBeVisible({ timeout: 5000 });

    // Press Down to go to Heading 2
    await page.keyboard.press("ArrowDown");

    // Press Enter to select Heading 2
    await page.keyboard.press("Enter");

    // Wait for the menu to close
    await expect(slashMenu).not.toBeVisible({ timeout: 5000 });

    // Type some text
    await page.keyboard.type("Subheading");

    // Verify the markdown output contains h2
    const markdownOutput = page.getByTestId("markdown-output");
    await expect(markdownOutput).toContainText("## Subheading", {
      timeout: 5000,
    });
  });

  test("should close menu on Escape", async ({ page }) => {
    const editorContainer = page.getByTestId("editor-container");
    const editor = editorContainer.locator('[contenteditable="true"]');

    await expect(editor).toBeVisible({ timeout: 5000 });

    // Focus the editor
    await editor.click();

    // Type "/" to trigger slash command menu
    await page.keyboard.type("/");

    // Wait for the slash command menu to appear
    const slashMenu = page.locator('[data-slot="slash-command-menu"]');
    await expect(slashMenu).toBeVisible({ timeout: 5000 });

    // Press Escape to close the menu
    await page.keyboard.press("Escape");

    // Menu should be closed
    await expect(slashMenu).not.toBeVisible({ timeout: 5000 });
  });

  test("should select item by clicking", async ({ page }) => {
    const editorContainer = page.getByTestId("editor-container");
    const editor = editorContainer.locator('[contenteditable="true"]');

    await expect(editor).toBeVisible({ timeout: 5000 });

    // Focus the editor
    await editor.click();

    // Type "/" to trigger slash command menu
    await page.keyboard.type("/");

    // Wait for the slash command menu to appear
    const slashMenu = page.locator('[data-slot="slash-command-menu"]');
    await expect(slashMenu).toBeVisible({ timeout: 5000 });

    // Click on "Bullet List" - use the button role to get the specific element
    await slashMenu.getByRole("button", { name: BULLET_LIST_PATTERN }).click();

    // Wait for the menu to close
    await expect(slashMenu).not.toBeVisible({ timeout: 5000 });

    // Type some text
    await page.keyboard.type("List item");

    // Verify the markdown output contains bullet list
    const markdownOutput = page.getByTestId("markdown-output");
    await expect(markdownOutput).toContainText("- List item", {
      timeout: 5000,
    });
  });

  test("should filter menu items while typing", async ({ page }) => {
    const editorContainer = page.getByTestId("editor-container");
    const editor = editorContainer.locator('[contenteditable="true"]');

    await expect(editor).toBeVisible({ timeout: 5000 });

    // Focus the editor
    await editor.click();

    // Type "/head" to filter to heading options
    await page.keyboard.type("/head");

    // Wait for the slash command menu to appear
    const slashMenu = page.locator('[data-slot="slash-command-menu"]');
    await expect(slashMenu).toBeVisible({ timeout: 5000 });

    // Should show heading options
    await expect(slashMenu.getByText("Heading 1")).toBeVisible();
    await expect(slashMenu.getByText("Heading 2")).toBeVisible();
    await expect(slashMenu.getByText("Heading 3")).toBeVisible();

    // Should NOT show other options
    await expect(slashMenu.getByText("Bullet List")).not.toBeVisible();
  });
});
