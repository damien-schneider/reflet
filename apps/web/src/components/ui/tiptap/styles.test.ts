import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Read the CSS file content for testing
const cssPath = join(__dirname, "styles.css");
const cssContent = readFileSync(cssPath, "utf-8");

describe("Tiptap Styles", () => {
  describe("heading styles", () => {
    it("has h1 styles for tiptap-markdown-editor", () => {
      expect(cssContent).toContain(".tiptap-markdown-editor h1");
    });

    it("has h2 styles for tiptap-markdown-editor", () => {
      expect(cssContent).toContain(".tiptap-markdown-editor h2");
    });

    it("has h3 styles for tiptap-markdown-editor", () => {
      expect(cssContent).toContain(".tiptap-markdown-editor h3");
    });

    it("has h1 styles for tiptap-minimal-editor", () => {
      expect(cssContent).toContain(".tiptap-minimal-editor h1");
    });

    it("has h2 styles for tiptap-minimal-editor", () => {
      expect(cssContent).toContain(".tiptap-minimal-editor h2");
    });

    it("has h3 styles for tiptap-minimal-editor", () => {
      expect(cssContent).toContain(".tiptap-minimal-editor h3");
    });
  });

  describe("list styles", () => {
    it("has ul styles for tiptap-minimal-editor", () => {
      expect(cssContent).toContain(".tiptap-minimal-editor ul");
    });

    it("has ol styles for tiptap-minimal-editor", () => {
      expect(cssContent).toContain(".tiptap-minimal-editor ol");
    });
  });

  describe("blockquote styles", () => {
    it("has blockquote styles for tiptap-minimal-editor", () => {
      expect(cssContent).toContain(".tiptap-minimal-editor blockquote");
    });
  });

  describe("code styles", () => {
    it("has code styles for tiptap-minimal-editor", () => {
      expect(cssContent).toContain(".tiptap-minimal-editor code");
    });

    it("has pre styles for tiptap-minimal-editor", () => {
      expect(cssContent).toContain(".tiptap-minimal-editor pre");
    });
  });

  describe("video styles", () => {
    it("has video styles", () => {
      expect(cssContent).toContain(".tiptap-video");
    });
  });

  describe("title editor styles", () => {
    it("has title editor base styles", () => {
      expect(cssContent).toContain(".tiptap-title-editor");
    });

    it("has title editor placeholder styles", () => {
      expect(cssContent).toContain(".tiptap-title-editor .is-editor-empty");
    });
  });
});
