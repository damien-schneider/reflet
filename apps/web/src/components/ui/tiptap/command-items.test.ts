import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type CommandItem, createSlashCommands } from "./command-items";

const editors: Editor[] = [];

afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor.destroy();
  }
});

const SLASH_RANGE = { from: 8, to: 9 };

const runFromSlash = (command: CommandItem) => {
  const editor = new Editor({
    content: "<p>Intro</p><p>/</p>",
    extensions: [StarterKit.configure({ link: false })],
  });
  editors.push(editor);
  editor.commands.setTextSelection(SLASH_RANGE.to);
  command.command({ editor, range: SLASH_RANGE });
  return editor.getHTML();
};

const commandTitled = (commands: CommandItem[], title: string) => {
  const command = commands.find((item) => item.title === title);
  if (!command) {
    throw new Error(`No "${title}" command`);
  }
  return command;
};

describe("createSlashCommands", () => {
  it.each([
    ["Heading 1", "<p>Intro</p><h1></h1><p></p>"],
    ["Heading 2", "<p>Intro</p><h2></h2><p></p>"],
    ["Heading 3", "<p>Intro</p><h3></h3><p></p>"],
    ["Bullet list", "<p>Intro</p><ul><li><p></p></li></ul><p></p>"],
    ["Numbered list", "<p>Intro</p><ol><li><p></p></li></ol><p></p>"],
    ["Quote", "<p>Intro</p><blockquote><p></p></blockquote><p></p>"],
    ["Code block", "<p>Intro</p><pre><code></code></pre><p></p>"],
    ["Divider", "<p>Intro</p><hr><p></p>"],
  ])("“%s” replaces the typed slash with that block", (title, html) => {
    expect(runFromSlash(commandTitled(createSlashCommands(), title))).toBe(
      html
    );
  });

  it("offers Image only when uploads are wired, and removes the slash before uploading", () => {
    expect(createSlashCommands().some((item) => item.title === "Image")).toBe(
      false
    );
    const onImageUpload = vi.fn();
    const html = runFromSlash(
      commandTitled(createSlashCommands(onImageUpload), "Image")
    );
    expect(html).toBe("<p>Intro</p><p></p>");
    expect(onImageUpload).toHaveBeenCalledOnce();
  });

  it("offers Video only when uploads are wired, and removes the slash before uploading", () => {
    expect(createSlashCommands().some((item) => item.title === "Video")).toBe(
      false
    );
    const onVideoUpload = vi.fn();
    const html = runFromSlash(
      commandTitled(createSlashCommands(undefined, onVideoUpload), "Video")
    );
    expect(html).toBe("<p>Intro</p><p></p>");
    expect(onVideoUpload).toHaveBeenCalledOnce();
  });
});
