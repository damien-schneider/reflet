import { describe, expect, it } from "vitest";
import { matchesHotkey } from "../ui/keyboard";

function keys(overrides: Partial<KeyboardEvent> = {}) {
  return {
    altKey: false,
    code: "KeyF",
    ctrlKey: false,
    key: "f",
    metaKey: false,
    shiftKey: false,
    ...overrides,
  };
}

describe("matchesHotkey", () => {
  it("matches a plain modifier plus letter", () => {
    expect(matchesHotkey(keys({ altKey: true }), "alt+f")).toBe(true);
  });

  it("rejects the same letter without the modifier", () => {
    expect(matchesHotkey(keys(), "alt+f")).toBe(false);
  });

  it("rejects extra modifiers the shortcut did not ask for", () => {
    expect(matchesHotkey(keys({ altKey: true, shiftKey: true }), "alt+f")).toBe(
      false
    );
  });

  it("maps mod to command on apple platforms", () => {
    expect(matchesHotkey(keys({ metaKey: true }), "mod+f", "MacIntel")).toBe(
      true
    );
    expect(matchesHotkey(keys({ ctrlKey: true }), "mod+f", "MacIntel")).toBe(
      false
    );
  });

  it("maps mod to control elsewhere", () => {
    expect(matchesHotkey(keys({ ctrlKey: true }), "mod+f", "Win32")).toBe(true);
    expect(matchesHotkey(keys({ metaKey: true }), "mod+f", "Win32")).toBe(
      false
    );
  });

  it("supports multi modifier shortcuts", () => {
    expect(
      matchesHotkey(
        keys({ key: "K", metaKey: true, shiftKey: true }),
        "mod+shift+k",
        "MacIntel"
      )
    ).toBe(true);
  });

  it("is case insensitive on the key", () => {
    expect(matchesHotkey(keys({ altKey: true, key: "F" }), "alt+f")).toBe(true);
  });

  it("ignores whitespace around the parts", () => {
    expect(matchesHotkey(keys({ altKey: true }), " alt + f ")).toBe(true);
  });

  it("matches the physical key when macOS Option turns the letter into a symbol", () => {
    expect(
      matchesHotkey(keys({ altKey: true, key: "ƒ" }), "alt+f", "MacIntel")
    ).toBe(true);
  });

  it("matches the physical key on a non-Latin layout", () => {
    expect(
      matchesHotkey(
        keys({ code: "KeyC", ctrlKey: true, key: "с" }),
        "mod+c",
        "Win32"
      )
    ).toBe(true);
  });

  it("follows the typed letter, not the physical key, on Latin remapped layouts", () => {
    const azertyQ = keys({ code: "KeyA", ctrlKey: true, key: "q" });
    expect(matchesHotkey(azertyQ, "mod+a", "Win32")).toBe(false);
    expect(matchesHotkey(azertyQ, "mod+q", "Win32")).toBe(true);
  });
});
