import { type AnyExtension, Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createExtensions } from "./editor-extensions";
import { ReadOnlyVideoExtension } from "./video-extension";

const VIDEO_URL = "https://files.example.com/storage/clip.mp4?token=a&b=1";

const editors: Editor[] = [];

const WRITABLE_EXTENSIONS = createExtensions({
  onImageUpload: vi.fn(),
  onVideoUpload: vi.fn(),
  placeholder: "",
});

const RENDERER_EXTENSIONS: AnyExtension[] = [
  StarterKit.configure({ link: false }),
  ReadOnlyVideoExtension,
  Markdown.configure({ html: false }),
];

const createEditor = (content: string, extensions: AnyExtension[]) => {
  const editor = new Editor({ content, extensions });
  editors.push(editor);
  return editor;
};

const createWritableEditor = (content = "") =>
  createEditor(content, WRITABLE_EXTENSIONS);

const createRendererEditor = (content: string) =>
  createEditor(content, RENDERER_EXTENSIONS);

const readMarkdown = (editor: Editor): string => {
  const { storage } = editor;
  if (!("markdown" in storage)) {
    throw new Error("Markdown storage missing");
  }
  const { markdown } = storage;
  if (
    typeof markdown !== "object" ||
    markdown === null ||
    !("getMarkdown" in markdown) ||
    typeof markdown.getMarkdown !== "function"
  ) {
    throw new Error("getMarkdown missing");
  }
  return String(markdown.getMarkdown());
};

const findVideoSources = (editor: Editor): string[] => {
  const sources: string[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === "video") {
      sources.push(String(node.attrs.src));
    }
  });
  return sources;
};

const insertUploadedVideo = (editor: Editor, src: string) =>
  editor.chain().focus().insertContent({ attrs: { src }, type: "video" }).run();

afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor.destroy();
  }
});

describe("video node", () => {
  it("keeps an uploaded video through insert, markdown save, and reload", () => {
    const editor = createWritableEditor();
    insertUploadedVideo(editor, VIDEO_URL);

    expect(findVideoSources(editor)).toEqual([VIDEO_URL]);
    const video = editor.view.dom.querySelector("video.tiptap-video");
    expect(video?.getAttribute("src")).toBe(VIDEO_URL);
    expect(video?.hasAttribute("controls")).toBe(true);
    expect(video?.getAttribute("preload")).toBe("metadata");

    const markdown = readMarkdown(editor);
    expect(markdown).toContain("<video src=");

    const reloaded = createWritableEditor(markdown);
    expect(findVideoSources(reloaded)).toEqual([VIDEO_URL]);
    expect(readMarkdown(reloaded)).toBe(markdown);
  });

  it("keeps surrounding paragraphs intact around a saved video", () => {
    const editor = createWritableEditor("Before\n\nAfter");
    editor.commands.setTextSelection("Before".length + 1);
    insertUploadedVideo(editor, VIDEO_URL);

    const reloaded = createWritableEditor(readMarkdown(editor));
    expect(reloaded.state.doc.children.map((node) => node.type.name)).toEqual([
      "paragraph",
      "video",
      "paragraph",
    ]);
    expect(reloaded.getText()).toContain("Before");
    expect(reloaded.getText()).toContain("After");
    expect(findVideoSources(reloaded)).toEqual([VIDEO_URL]);
  });

  it("renders a saved video in the read-only renderer", () => {
    const editor = createWritableEditor();
    insertUploadedVideo(editor, VIDEO_URL);

    const rendered = createRendererEditor(readMarkdown(editor));

    expect(findVideoSources(rendered)).toEqual([VIDEO_URL]);
    expect(rendered.getText()).not.toContain("<video");
    const video = rendered.view.dom.querySelector("video.tiptap-video");
    expect(video?.getAttribute("src")).toBe(VIDEO_URL);
  });

  it.each(["http://files.example.com/clip.mp4", "javascript:alert(1)"])(
    "never turns a non-https video source %s into a video",
    (src) => {
      const markdown = `<video src="${src}" controls class="tiptap-video" preload="metadata"></video>`;

      expect(findVideoSources(createWritableEditor(markdown))).toEqual([]);
      expect(findVideoSources(createRendererEditor(markdown))).toEqual([]);
    }
  );
});
