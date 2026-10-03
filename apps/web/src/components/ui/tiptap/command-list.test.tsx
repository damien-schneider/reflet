import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef, type RefObject } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommandListHandle } from "./command-items";

const createMockIcon = (name: string) => {
  const Icon = (props: Record<string, unknown>) => (
    <svg data-testid={`icon-${name}`} {...props} />
  );
  Icon.displayName = name;
  return Icon;
};

const createMockItems = () => [
  {
    command: vi.fn(),
    description: "Large section heading",
    icon: createMockIcon("heading-1"),
    title: "Heading 1",
  },
  {
    command: vi.fn(),
    description: "Create a bullet list",
    icon: createMockIcon("bullet-list"),
    title: "Bullet List",
  },
  {
    command: vi.fn(),
    description: "Display code",
    icon: createMockIcon("code-block"),
    title: "Code Block",
  },
];

const pressKey = (ref: RefObject<CommandListHandle | null>, key: string) =>
  ref.current?.onKeyDown({
    event: new KeyboardEvent("keydown", { cancelable: true, key }),
  });

describe("CommandList", () => {
  let CommandList: typeof import("./command-list").CommandList;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("./command-list");
    CommandList = mod.CommandList;
  });

  it("returns null when items array is empty", () => {
    const { container } = render(<CommandList command={vi.fn()} items={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders all items with titles and descriptions", () => {
    const items = createMockItems();
    render(<CommandList command={vi.fn()} items={items} />);

    expect(screen.getByText("Heading 1")).toBeInTheDocument();
    expect(screen.getByText("Large section heading")).toBeInTheDocument();
    expect(screen.getByText("Bullet List")).toBeInTheDocument();
    expect(screen.getByText("Create a bullet list")).toBeInTheDocument();
    expect(screen.getByText("Code Block")).toBeInTheDocument();
    expect(screen.getByText("Display code")).toBeInTheDocument();
  });

  it("renders icons for each item", () => {
    const items = createMockItems();
    render(<CommandList command={vi.fn()} items={items} />);

    expect(screen.getByTestId("icon-heading-1")).toBeInTheDocument();
    expect(screen.getByTestId("icon-bullet-list")).toBeInTheDocument();
    expect(screen.getByTestId("icon-code-block")).toBeInTheDocument();
  });

  it("renders the container with data-slot attribute", () => {
    const items = createMockItems();
    render(<CommandList command={vi.fn()} items={items} />);

    const menu = document.querySelector('[data-slot="slash-command-menu"]');
    expect(menu).toBeInTheDocument();
  });

  it("highlights first item by default", () => {
    const items = createMockItems();
    render(<CommandList command={vi.fn()} items={items} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveAttribute("data-active", "true");
    expect(buttons[1]).not.toHaveAttribute("data-active", "true");
  });

  it("calls command with correct item on click", () => {
    const items = createMockItems();
    const command = vi.fn();
    render(<CommandList command={command} items={items} />);

    fireEvent.click(screen.getByText("Bullet List"));
    expect(command).toHaveBeenCalledWith(items[1]);
  });

  it("prevents default on mouseDown", () => {
    const items = createMockItems();
    render(<CommandList command={vi.fn()} items={items} />);

    const button = screen.getAllByRole("button")[0];
    const event = new MouseEvent("mousedown", { bubbles: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    button.dispatchEvent(event);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("exposes a keyboard handle via ref", () => {
    const ref = createRef<CommandListHandle>();
    render(
      <CommandList command={vi.fn()} items={createMockItems()} ref={ref} />
    );

    expect(ref.current?.onKeyDown).toEqual(expect.any(Function));
  });

  describe("keyboard navigation", () => {
    it("ArrowDown moves selection down", () => {
      const ref = createRef<CommandListHandle>();
      render(
        <CommandList command={vi.fn()} items={createMockItems()} ref={ref} />
      );

      let result: boolean | undefined = false;
      act(() => {
        result = pressKey(ref, "ArrowDown");
      });
      expect(result).toBe(true);
      expect(screen.getAllByRole("button")[1]).toHaveAttribute(
        "data-active",
        "true"
      );
    });

    it("ArrowUp moves selection up (wraps around)", () => {
      const ref = createRef<CommandListHandle>();
      render(
        <CommandList command={vi.fn()} items={createMockItems()} ref={ref} />
      );

      let result: boolean | undefined = false;
      act(() => {
        result = pressKey(ref, "ArrowUp");
      });
      expect(result).toBe(true);
      expect(screen.getAllByRole("button")[2]).toHaveAttribute(
        "data-active",
        "true"
      );
    });

    it("Enter selects the current item", () => {
      const items = createMockItems();
      const command = vi.fn();
      const ref = createRef<CommandListHandle>();
      render(<CommandList command={command} items={items} ref={ref} />);

      expect(pressKey(ref, "Enter")).toBe(true);
      expect(command).toHaveBeenCalledWith(items[0]);
    });

    it("lets Enter through when no command matches", () => {
      const ref = createRef<CommandListHandle>();
      render(<CommandList command={vi.fn()} items={[]} ref={ref} />);

      const event = new KeyboardEvent("keydown", {
        cancelable: true,
        key: "Enter",
      });
      expect(ref.current?.onKeyDown({ event })).toBe(false);
      expect(event.defaultPrevented).toBe(false);
    });

    it("unhandled key returns false", () => {
      const ref = createRef<CommandListHandle>();
      render(
        <CommandList command={vi.fn()} items={createMockItems()} ref={ref} />
      );

      expect(pressKey(ref, "Tab")).toBe(false);
    });
  });

  it("resets selected index when items change", () => {
    const items = createMockItems();
    const command = vi.fn();
    const ref = createRef<CommandListHandle>();
    const { rerender } = render(
      <CommandList command={command} items={items} ref={ref} />
    );

    act(() => {
      pressKey(ref, "ArrowDown");
    });

    const newItems = [items[0]];
    rerender(<CommandList command={command} items={newItems} ref={ref} />);

    pressKey(ref, "Enter");
    expect(command).toHaveBeenCalledWith(newItems[0]);
  });
});
