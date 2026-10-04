import { describe, expect, it } from "vitest";
import { editorUrl } from "./editor-url";

describe("editorUrl", () => {
  it("opens a Windows path the way VS Code expects it", () => {
    expect(editorUrl("vscode", "C:\\My Repo\\src\\App.tsx", 12, 3)).toBe(
      "vscode://file/C:/My%20Repo/src/App.tsx:12:4"
    );
  });

  it("opens a POSIX path unchanged", () => {
    expect(editorUrl("cursor", "/Users/me/src/App.tsx", 12, 3)).toBe(
      "cursor://file/Users/me/src/App.tsx:12:4"
    );
  });
});
