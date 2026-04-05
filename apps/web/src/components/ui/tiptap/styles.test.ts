import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Read the CSS file content for testing
const cssPath = join(import.meta.dirname, "styles.css");
const cssContent = readFileSync(cssPath, "utf-8");

describe("Tiptap Styles", () => {
  describe("shared markdown-content typography", () => {
    it("has h1 styles", () => {
      expect(cssContent).toContain(".markdown-content h1");
    });

    it("has h2 styles", () => {
      expect(cssContent).toContain(".markdown-content h2");
    });

    it("has h3 styles", () => {
      expect(cssContent).toContain(".markdown-content h3");
    });

    it("has ul styles", () => {
      expect(cssContent).toContain(".markdown-content ul");
    });

    it("has ol styles", () => {
      expect(cssContent).toContain(".markdown-content ol");
    });

    it("has blockquote styles", () => {
      expect(cssContent).toContain(".markdown-content blockquote");
    });

    it("has code styles", () => {
      expect(cssContent).toContain(".markdown-content code");
    });

    it("has pre styles", () => {
      expect(cssContent).toContain(".markdown-content pre");
    });
  });

  describe("editor variants", () => {
    it("has tiptap-minimal-editor styles", () => {
      expect(cssContent).toContain(".tiptap-minimal-editor");
    });

    it("has tiptap-markdown-editor focus styles", () => {
      expect(cssContent).toContain(".tiptap-markdown-editor");
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
