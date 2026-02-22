import { describe, expect, it, vi } from "vitest";
import { type CommandItem, createSlashCommands } from "./command-items";

const createMockEditor = () => {
  const chainMethods: Record<string, ReturnType<typeof vi.fn>> = {};
  const chain = new Proxy(chainMethods, {
    get: (_target, prop: string) => {
      if (!chainMethods[prop]) {
        chainMethods[prop] = vi.fn(() => chain);
      }
      return chainMethods[prop];
    },
  });
  return {
    chain: () => chain,
    _chain: chain,
  };
};

const defaultRange = { from: 0, to: 5 };

describe("createSlashCommands", () => {
  it("returns 8 base commands without callbacks", () => {
    const commands = createSlashCommands();
    expect(commands).toHaveLength(8);
  });

  it("includes Heading 1 command", () => {
    const commands = createSlashCommands();
    expect(commands.find((c) => c.title === "Heading 1")).toBeDefined();
  });

  it("includes Heading 2 command", () => {
    const commands = createSlashCommands();
    expect(commands.find((c) => c.title === "Heading 2")).toBeDefined();
  });

  it("includes Heading 3 command", () => {
    const commands = createSlashCommands();
    expect(commands.find((c) => c.title === "Heading 3")).toBeDefined();
  });

  it("includes Bullet List command", () => {
    const commands = createSlashCommands();
    expect(commands.find((c) => c.title === "Bullet List")).toBeDefined();
  });

  it("includes Numbered List command", () => {
    const commands = createSlashCommands();
    expect(commands.find((c) => c.title === "Numbered List")).toBeDefined();
  });

  it("includes Quote command", () => {
    const commands = createSlashCommands();
    expect(commands.find((c) => c.title === "Quote")).toBeDefined();
  });

  it("includes Code Block command", () => {
    const commands = createSlashCommands();
    expect(commands.find((c) => c.title === "Code Block")).toBeDefined();
  });

  it("includes Divider command", () => {
    const commands = createSlashCommands();
    expect(commands.find((c) => c.title === "Divider")).toBeDefined();
  });

  it("adds Image command when onImageUpload is provided", () => {
    const commands = createSlashCommands(() => {});
    expect(commands).toHaveLength(9);
    expect(commands.find((c) => c.title === "Image")).toBeDefined();
  });

  it("adds Video command when onVideoUpload is provided", () => {
    const commands = createSlashCommands(undefined, () => {});
    expect(commands).toHaveLength(9);
    expect(commands.find((c) => c.title === "Video")).toBeDefined();
  });

  it("adds both Image and Video when both callbacks provided", () => {
    const commands = createSlashCommands(
      () => {},
      () => {}
    );
    expect(commands).toHaveLength(10);
  });

  it("each command has title, description, icon, and command", () => {
    const commands = createSlashCommands();
    for (const cmd of commands) {
      expect(cmd.title).toBeTruthy();
      expect(cmd.description).toBeTruthy();
      expect(cmd.icon).toBeDefined();
      expect(typeof cmd.command).toBe("function");
    }
  });

  it("Heading 1 command calls toggleHeading with level 1", () => {
    const commands = createSlashCommands();
    const heading1 = commands.find(
      (c) => c.title === "Heading 1"
    ) as CommandItem;
    const { chain, _chain } = createMockEditor();
    heading1.command({ editor: { chain } as any, range: defaultRange });
    expect(_chain.focus).toHaveBeenCalled();
    expect(_chain.deleteRange).toHaveBeenCalledWith(defaultRange);
    expect(_chain.toggleHeading).toHaveBeenCalledWith({ level: 1 });
    expect(_chain.run).toHaveBeenCalled();
  });

  it("Heading 2 command calls toggleHeading with level 2", () => {
    const commands = createSlashCommands();
    const heading2 = commands.find(
      (c) => c.title === "Heading 2"
    ) as CommandItem;
    const { chain, _chain } = createMockEditor();
    heading2.command({ editor: { chain } as any, range: defaultRange });
    expect(_chain.toggleHeading).toHaveBeenCalledWith({ level: 2 });
  });

  it("Heading 3 command calls toggleHeading with level 3", () => {
    const commands = createSlashCommands();
    const heading3 = commands.find(
      (c) => c.title === "Heading 3"
    ) as CommandItem;
    const { chain, _chain } = createMockEditor();
    heading3.command({ editor: { chain } as any, range: defaultRange });
    expect(_chain.toggleHeading).toHaveBeenCalledWith({ level: 3 });
  });

  it("Bullet List command calls toggleBulletList", () => {
    const commands = createSlashCommands();
    const bullet = commands.find(
      (c) => c.title === "Bullet List"
    ) as CommandItem;
    const { chain, _chain } = createMockEditor();
    bullet.command({ editor: { chain } as any, range: defaultRange });
    expect(_chain.toggleBulletList).toHaveBeenCalled();
  });

  it("Numbered List command calls toggleOrderedList", () => {
    const commands = createSlashCommands();
    const numbered = commands.find(
      (c) => c.title === "Numbered List"
    ) as CommandItem;
    const { chain, _chain } = createMockEditor();
    numbered.command({ editor: { chain } as any, range: defaultRange });
    expect(_chain.toggleOrderedList).toHaveBeenCalled();
  });

  it("Quote command calls toggleBlockquote", () => {
    const commands = createSlashCommands();
    const quote = commands.find((c) => c.title === "Quote") as CommandItem;
    const { chain, _chain } = createMockEditor();
    quote.command({ editor: { chain } as any, range: defaultRange });
    expect(_chain.toggleBlockquote).toHaveBeenCalled();
  });

  it("Code Block command calls toggleCodeBlock", () => {
    const commands = createSlashCommands();
    const code = commands.find((c) => c.title === "Code Block") as CommandItem;
    const { chain, _chain } = createMockEditor();
    code.command({ editor: { chain } as any, range: defaultRange });
    expect(_chain.toggleCodeBlock).toHaveBeenCalled();
  });

  it("Divider command calls setHorizontalRule", () => {
    const commands = createSlashCommands();
    const divider = commands.find((c) => c.title === "Divider") as CommandItem;
    const { chain, _chain } = createMockEditor();
    divider.command({ editor: { chain } as any, range: defaultRange });
    expect(_chain.setHorizontalRule).toHaveBeenCalled();
  });

  it("Image command calls onImageUpload after deleting range", () => {
    const onImageUpload = vi.fn();
    const commands = createSlashCommands(onImageUpload);
    const image = commands.find((c) => c.title === "Image") as CommandItem;
    const { chain, _chain } = createMockEditor();
    image.command({ editor: { chain } as any, range: defaultRange });
    expect(_chain.focus).toHaveBeenCalled();
    expect(_chain.deleteRange).toHaveBeenCalledWith(defaultRange);
    expect(_chain.run).toHaveBeenCalled();
    expect(onImageUpload).toHaveBeenCalled();
  });

  it("Video command calls onVideoUpload after deleting range", () => {
    const onVideoUpload = vi.fn();
    const commands = createSlashCommands(undefined, onVideoUpload);
    const video = commands.find((c) => c.title === "Video") as CommandItem;
    const { chain, _chain } = createMockEditor();
    video.command({ editor: { chain } as any, range: defaultRange });
    expect(_chain.focus).toHaveBeenCalled();
    expect(_chain.deleteRange).toHaveBeenCalledWith(defaultRange);
    expect(_chain.run).toHaveBeenCalled();
    expect(onVideoUpload).toHaveBeenCalled();
  });

  it("Image command has correct description", () => {
    const commands = createSlashCommands(() => {});
    const image = commands.find((c) => c.title === "Image");
    expect(image?.description).toBe("Upload an image");
  });

  it("Video command has correct description", () => {
    const commands = createSlashCommands(undefined, () => {});
    const video = commands.find((c) => c.title === "Video");
    expect(video?.description).toBe("Upload a video");
  });
});
