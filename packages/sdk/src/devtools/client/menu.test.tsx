import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DevtoolsSheet } from "./devtools-sheet";
import { Menu } from "./menu";

afterEach(cleanup);

it("Escape closes an open menu and leaves the panel open, then closes the panel", () => {
  const onClose = vi.fn();
  render(
    <DevtoolsSheet
      navigation={{
        onSelectTab: vi.fn(),
        place: null,
        tab: "inbox",
        tabs: ["inbox", "notes"],
      }}
      onClose={onClose}
      side="right"
    >
      <Menu
        items={[
          { checked: true, label: "This page", onSelect: vi.fn() },
          { checked: false, label: "Whole board", onSelect: vi.fn() },
        ]}
        trigger={{
          className: "icon-btn",
          content: "Scope",
          label: "Show feedback from",
        }}
      />
    </DevtoolsSheet>
  );
  const trigger = screen.getByRole("button", { name: "Show feedback from" });

  fireEvent.click(trigger);
  const checked = screen.getByRole("menuitemradio", { name: "This page" });
  expect(document.activeElement).toBe(checked);
  fireEvent.keyDown(checked, { key: "Escape" });

  expect(screen.queryByRole("menu")).toBeNull();
  expect(document.activeElement).toBe(trigger);
  expect(onClose).not.toHaveBeenCalled();

  fireEvent.keyDown(trigger, { key: "Escape" });
  expect(onClose).toHaveBeenCalledTimes(1);
});

it("arrow keys move between the choices only, past the header and the note", () => {
  const choose = vi.fn();
  render(
    <Menu
      groupLabel="Record sessions as"
      header="Ada Lovelace"
      items={["Control UI", "One Rec", "Reflet"].map((name) => ({
        checked: name === "One Rec",
        label: name,
        onSelect: () => choose(name),
      }))}
      note="Adding to a board needs this app's own connection."
      trigger={{ className: "dt-account", content: "Ada", label: "Account" }}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "Account" }));
  const choices = screen.getByRole("group", { name: "Record sessions as" });
  const focusedName = () => document.activeElement?.textContent;
  expect(focusedName()).toBe("One Rec");

  fireEvent.keyDown(choices, { key: "ArrowDown" });
  expect(focusedName()).toBe("Reflet");
  fireEvent.keyDown(choices, { key: "ArrowDown" });
  expect(focusedName()).toBe("Control UI");
  fireEvent.keyDown(choices, { key: "ArrowUp" });
  expect(focusedName()).toBe("Reflet");

  fireEvent.click(screen.getByRole("menuitemradio", { name: "Control UI" }));
  expect(choose).toHaveBeenCalledWith("Control UI");
  expect(screen.queryByRole("menu")).toBeNull();
});
