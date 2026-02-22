import { createStore } from "jotai";
import { describe, expect, it } from "vitest";
import {
  authDialogMessageAtom,
  authDialogModeAtom,
  authDialogOpenAtom,
  closeAuthDialogAtom,
  openAuthDialogAtom,
} from "./auth";

describe("auth store", () => {
  describe("initial values", () => {
    it("authDialogOpenAtom defaults to false", () => {
      const store = createStore();
      expect(store.get(authDialogOpenAtom)).toBe(false);
    });

    it("authDialogModeAtom defaults to signIn", () => {
      const store = createStore();
      expect(store.get(authDialogModeAtom)).toBe("signIn");
    });

    it("authDialogMessageAtom defaults to null", () => {
      const store = createStore();
      expect(store.get(authDialogMessageAtom)).toBeNull();
    });
  });

  describe("openAuthDialogAtom", () => {
    it("opens dialog with default mode when called with no options", () => {
      const store = createStore();
      store.set(openAuthDialogAtom);

      expect(store.get(authDialogOpenAtom)).toBe(true);
      expect(store.get(authDialogModeAtom)).toBe("signIn");
      expect(store.get(authDialogMessageAtom)).toBeNull();
    });

    it("opens dialog in signUp mode when passed string", () => {
      const store = createStore();
      store.set(openAuthDialogAtom, "signUp");

      expect(store.get(authDialogOpenAtom)).toBe(true);
      expect(store.get(authDialogModeAtom)).toBe("signUp");
      expect(store.get(authDialogMessageAtom)).toBeNull();
    });

    it("opens dialog in signIn mode when passed string", () => {
      const store = createStore();
      store.set(openAuthDialogAtom, "signIn");

      expect(store.get(authDialogOpenAtom)).toBe(true);
      expect(store.get(authDialogModeAtom)).toBe("signIn");
      expect(store.get(authDialogMessageAtom)).toBeNull();
    });

    it("opens dialog with mode and message from options object", () => {
      const store = createStore();
      store.set(openAuthDialogAtom, {
        mode: "signUp",
        message: "Please sign up to continue",
      });

      expect(store.get(authDialogOpenAtom)).toBe(true);
      expect(store.get(authDialogModeAtom)).toBe("signUp");
      expect(store.get(authDialogMessageAtom)).toBe(
        "Please sign up to continue"
      );
    });

    it("defaults to signIn mode when options object has no mode", () => {
      const store = createStore();
      store.set(openAuthDialogAtom, { message: "Auth required" });

      expect(store.get(authDialogModeAtom)).toBe("signIn");
      expect(store.get(authDialogMessageAtom)).toBe("Auth required");
    });

    it("defaults message to null when options object has no message", () => {
      const store = createStore();
      store.set(openAuthDialogAtom, { mode: "signUp" });

      expect(store.get(authDialogModeAtom)).toBe("signUp");
      expect(store.get(authDialogMessageAtom)).toBeNull();
    });
  });

  describe("closeAuthDialogAtom", () => {
    it("closes dialog and clears message", () => {
      const store = createStore();

      // First open with a message
      store.set(openAuthDialogAtom, {
        mode: "signUp",
        message: "Some message",
      });
      expect(store.get(authDialogOpenAtom)).toBe(true);

      // Then close
      store.set(closeAuthDialogAtom);

      expect(store.get(authDialogOpenAtom)).toBe(false);
      expect(store.get(authDialogMessageAtom)).toBeNull();
    });

    it("preserves mode after closing", () => {
      const store = createStore();
      store.set(openAuthDialogAtom, "signUp");
      store.set(closeAuthDialogAtom);

      // Mode is not reset on close
      expect(store.get(authDialogModeAtom)).toBe("signUp");
    });
  });
});
