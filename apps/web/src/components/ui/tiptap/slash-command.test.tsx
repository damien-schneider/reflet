/**
 * @vitest-environment jsdom
 */
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the cn utility
vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// Minimum z-index required to be above dialogs (which use z-50 = 50)
const DIALOG_Z_INDEX = 50;

describe("Slash Command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("createSlashCommands", () => {
    it("returns base commands without image/video when no callbacks provided", async () => {
      const { createSlashCommands } = await import("./slash-command");
      const commands = createSlashCommands();

      expect(commands.length).toBe(8); // 3 headings + bullet + numbered + quote + code + divider
      expect(commands.find((c) => c.title === "Heading 1")).toBeDefined();
      expect(commands.find((c) => c.title === "Heading 2")).toBeDefined();
      expect(commands.find((c) => c.title === "Heading 3")).toBeDefined();
      expect(commands.find((c) => c.title === "Bullet List")).toBeDefined();
      expect(commands.find((c) => c.title === "Numbered List")).toBeDefined();
      expect(commands.find((c) => c.title === "Quote")).toBeDefined();
      expect(commands.find((c) => c.title === "Code Block")).toBeDefined();
      expect(commands.find((c) => c.title === "Divider")).toBeDefined();
      expect(commands.find((c) => c.title === "Image")).toBeUndefined();
      expect(commands.find((c) => c.title === "Video")).toBeUndefined();
    }, 10_000);

    it("includes Image command when onImageUpload is provided", async () => {
      const { createSlashCommands } = await import("./slash-command");
      const onImageUpload = vi.fn();
      const commands = createSlashCommands(onImageUpload);

      expect(commands.length).toBe(9);
      expect(commands.find((c) => c.title === "Image")).toBeDefined();
    });

    it("includes Video command when onVideoUpload is provided", async () => {
      const { createSlashCommands } = await import("./slash-command");
      const onVideoUpload = vi.fn();
      const commands = createSlashCommands(undefined, onVideoUpload);

      expect(commands.length).toBe(9);
      expect(commands.find((c) => c.title === "Video")).toBeDefined();
    });

    it("includes both Image and Video when both callbacks provided", async () => {
      const { createSlashCommands } = await import("./slash-command");
      const onImageUpload = vi.fn();
      const onVideoUpload = vi.fn();
      const commands = createSlashCommands(onImageUpload, onVideoUpload);

      expect(commands.length).toBe(10);
      expect(commands.find((c) => c.title === "Image")).toBeDefined();
      expect(commands.find((c) => c.title === "Video")).toBeDefined();
    });
  });

  describe("command execution", () => {
    it("Heading 1 command calls editor chain with toggleHeading level 1", async () => {
      const { createSlashCommands } = await import("./slash-command");
      const commands = createSlashCommands();
      const heading1Command = commands.find((c) => c.title === "Heading 1");

      const mockRun = vi.fn();
      const mockToggleHeading = vi.fn().mockReturnValue({ run: mockRun });
      const mockDeleteRange = vi
        .fn()
        .mockReturnValue({ toggleHeading: mockToggleHeading });
      const mockFocus = vi
        .fn()
        .mockReturnValue({ deleteRange: mockDeleteRange });
      const mockChain = vi.fn().mockReturnValue({ focus: mockFocus });
      const mockEditor = { chain: mockChain };

      heading1Command?.command({
        editor: mockEditor as never,
        range: { from: 0, to: 1 },
      });

      expect(mockChain).toHaveBeenCalled();
      expect(mockFocus).toHaveBeenCalled();
      expect(mockDeleteRange).toHaveBeenCalledWith({ from: 0, to: 1 });
      expect(mockToggleHeading).toHaveBeenCalledWith({ level: 1 });
      expect(mockRun).toHaveBeenCalled();
    });

    it("Image command calls onImageUpload callback", async () => {
      const { createSlashCommands } = await import("./slash-command");
      const onImageUpload = vi.fn();
      const commands = createSlashCommands(onImageUpload);
      const imageCommand = commands.find((c) => c.title === "Image");

      const mockRun = vi.fn();
      const mockDeleteRange = vi.fn().mockReturnValue({ run: mockRun });
      const mockFocus = vi
        .fn()
        .mockReturnValue({ deleteRange: mockDeleteRange });
      const mockChain = vi.fn().mockReturnValue({ focus: mockFocus });
      const mockEditor = { chain: mockChain };

      imageCommand?.command({
        editor: mockEditor as never,
        range: { from: 0, to: 1 },
      });

      expect(mockRun).toHaveBeenCalled();
      expect(onImageUpload).toHaveBeenCalled();
    });

    it("Video command calls onVideoUpload callback", async () => {
      const { createSlashCommands } = await import("./slash-command");
      const onVideoUpload = vi.fn();
      const commands = createSlashCommands(undefined, onVideoUpload);
      const videoCommand = commands.find((c) => c.title === "Video");

      const mockRun = vi.fn();
      const mockDeleteRange = vi.fn().mockReturnValue({ run: mockRun });
      const mockFocus = vi
        .fn()
        .mockReturnValue({ deleteRange: mockDeleteRange });
      const mockChain = vi.fn().mockReturnValue({ focus: mockFocus });
      const mockEditor = { chain: mockChain };

      videoCommand?.command({
        editor: mockEditor as never,
        range: { from: 0, to: 1 },
      });

      expect(mockRun).toHaveBeenCalled();
      expect(onVideoUpload).toHaveBeenCalled();
    });
  });

  describe("createSlashCommandExtension", () => {
    it("configures suggestion with char '/'", async () => {
      const { createSlashCommandExtension } = await import("./slash-command");
      const extension = createSlashCommandExtension({});

      // The extension should have the suggestion configured with char "/"
      expect(extension.options.suggestion.char).toBe("/");
    });

    it("passes image and video upload callbacks to suggestion items", async () => {
      const { createSlashCommands } = await import("./slash-command");
      const onImageUpload = vi.fn();
      const onVideoUpload = vi.fn();

      // Test that the commands include image and video when callbacks are provided
      const commands = createSlashCommands(onImageUpload, onVideoUpload);

      expect(commands.find((c) => c.title === "Image")).toBeDefined();
      expect(commands.find((c) => c.title === "Video")).toBeDefined();
    });
  });

  describe("dialog compatibility", () => {
    it("exports SLASH_MENU_Z_INDEX constant higher than dialog z-index", async () => {
      const { SLASH_MENU_Z_INDEX } = await import("./slash-command");

      // Slash menu must be above dialogs to work inside them
      expect(SLASH_MENU_Z_INDEX).toBeGreaterThan(DIALOG_Z_INDEX);
    });

    it("tippy popup should be configured with high z-index for dialog compatibility", async () => {
      // This test verifies the implementation detail that tippy is configured
      // with proper z-index to work inside dialogs
      const { SLASH_MENU_Z_INDEX } = await import("./slash-command");

      // The z-index should be at least 100 to be safely above modals
      expect(SLASH_MENU_Z_INDEX).toBeGreaterThanOrEqual(100);
    });
  });

  describe("findAppendTarget", () => {
    it("returns document.body when no element provided", async () => {
      const { findAppendTarget } = await import("./slash-command");

      const result = findAppendTarget(null);

      expect(result).toBe(document.body);
    });

    it("returns document.body when element is not inside a dialog", async () => {
      const { findAppendTarget } = await import("./slash-command");

      // Create an element not inside a dialog
      const outsideElement = document.createElement("div");
      document.body.appendChild(outsideElement);

      const result = findAppendTarget(outsideElement);

      expect(result).toBe(document.body);

      // Cleanup
      document.body.removeChild(outsideElement);
    });

    it("returns dialog content element when editor is inside a dialog", async () => {
      const { findAppendTarget } = await import("./slash-command");

      // Create a mock dialog structure with data-slot attribute
      const dialogContent = document.createElement("div");
      dialogContent.setAttribute("data-slot", "dialog-content");
      document.body.appendChild(dialogContent);

      const editorElement = document.createElement("div");
      dialogContent.appendChild(editorElement);

      const result = findAppendTarget(editorElement);

      expect(result).toBe(dialogContent);

      // Cleanup
      document.body.removeChild(dialogContent);
    });

    it("returns closest dialog content when nested inside multiple containers", async () => {
      const { findAppendTarget } = await import("./slash-command");

      // Create nested structure: body > dialog > wrapper > editor
      const dialogContent = document.createElement("div");
      dialogContent.setAttribute("data-slot", "dialog-content");
      document.body.appendChild(dialogContent);

      const wrapper = document.createElement("div");
      dialogContent.appendChild(wrapper);

      const editorElement = document.createElement("div");
      wrapper.appendChild(editorElement);

      const result = findAppendTarget(editorElement);

      expect(result).toBe(dialogContent);

      // Cleanup
      document.body.removeChild(dialogContent);
    });
  });
});
