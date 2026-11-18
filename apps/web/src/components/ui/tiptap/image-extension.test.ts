import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { ImageExtension } from "./image-extension";

const editors: Editor[] = [];

afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor.destroy();
  }
});

const savedImageAttributes = (html: string) => {
  const editor = new Editor({
    content: html,
    extensions: [StarterKit.configure({ link: false }), ImageExtension],
  });
  editors.push(editor);
  const saved = document.createElement("template");
  saved.innerHTML = editor.getHTML();
  const image = saved.content.querySelector("img");
  return Object.fromEntries(
    [...(image?.attributes ?? [])].map(({ name, value }) => [name, value])
  );
};

describe("ImageExtension", () => {
  it("keeps an image's width, height and alignment through save and reload", () => {
    expect(
      savedImageAttributes(
        '<img src="https://cdn.example.com/a.png" width="300" height="200" data-align="left">'
      )
    ).toEqual({
      "data-align": "left",
      height: "200",
      src: "https://cdn.example.com/a.png",
      width: "300",
    });
  });

  it("centers images without an alignment and omits unset dimensions", () => {
    expect(
      savedImageAttributes('<img src="https://cdn.example.com/a.png">')
    ).toEqual({
      "data-align": "center",
      src: "https://cdn.example.com/a.png",
    });
  });
});
