import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import type { SheetTab } from "./devtools-bar";
import { DevtoolsSheet } from "./devtools-sheet";

afterEach(cleanup);

function Sheet() {
  const [tab, setTab] = useState<SheetTab>("inbox");
  return (
    <DevtoolsSheet
      navigation={{
        onSelectTab: setTab,
        place: null,
        tab,
        tabs: ["inbox", "notes", "sessions"],
      }}
      onClose={vi.fn()}
      side="right"
    >
      Panel
    </DevtoolsSheet>
  );
}

function pressOnFocused(key: string) {
  if (!document.activeElement) {
    throw new Error("Nothing is focused");
  }
  fireEvent.keyDown(document.activeElement, { key });
}

function expectOpenTab(name: string) {
  const tab = screen.getByRole("tab", { name });
  expect(tab.getAttribute("aria-selected")).toBe("true");
  expect(document.activeElement).toBe(tab);
}

it("arrow keys move between the panel tabs and open the one they land on", () => {
  render(<Sheet />);
  screen.getByRole("tab", { name: "Board" }).focus();

  pressOnFocused("ArrowRight");
  expectOpenTab("Notes");

  pressOnFocused("ArrowLeft");
  pressOnFocused("ArrowLeft");
  expectOpenTab("Sessions");

  pressOnFocused("Home");
  expectOpenTab("Board");

  pressOnFocused("End");
  expectOpenTab("Sessions");
});

it("the tab list is a single Tab stop on the open tab", () => {
  render(<Sheet />);

  expect(
    screen.getAllByRole("tab").map((tab) => tab.getAttribute("tabindex"))
  ).toEqual(["0", "-1", "-1"]);
});
