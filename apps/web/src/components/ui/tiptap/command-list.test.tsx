import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

const createMockIcon = (name: string) => {
  const Icon = (props: Record<string, unknown>) => (
    <svg data-testid={`icon-${name}`} {...props} />
  );
  Icon.displayName = name;
  return Icon;
};

const createMockItems = () => [
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: createMockIcon("heading-1"),
    command: vi.fn(),
  },
  {
    title: "Bullet List",
    description: "Create a bullet list",
    icon: createMockIcon("bullet-list"),
    command: vi.fn(),
  },
  {
    title: "Code Block",
    description: "Display code",
    icon: createMockIcon("code-block"),
    command: vi.fn(),
  },
];

describe("CommandList", () => {
  let CommandList: typeof import("./command-list").CommandList;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("./command-list");
    CommandList = mod.CommandList;
  });

  afterEach(() => {
    cleanup();
  });

  it("returns null when items array is empty", () => {
    const { container } = render(
      <CommandList
        command={vi.fn()}
        items={[]}
        onRegisterKeyHandler={vi.fn()}
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders all items with titles and descriptions", () => {
    const items = createMockItems();
    render(
      <CommandList
        command={vi.fn()}
        items={items}
        onRegisterKeyHandler={vi.fn()}
      />
    );

    expect(screen.getByText("Heading 1")).toBeInTheDocument();
    expect(screen.getByText("Large section heading")).toBeInTheDocument();
    expect(screen.getByText("Bullet List")).toBeInTheDocument();
    expect(screen.getByText("Create a bullet list")).toBeInTheDocument();
    expect(screen.getByText("Code Block")).toBeInTheDocument();
    expect(screen.getByText("Display code")).toBeInTheDocument();
  });

  it("renders icons for each item", () => {
    const items = createMockItems();
    render(
      <CommandList
        command={vi.fn()}
        items={items}
        onRegisterKeyHandler={vi.fn()}
      />
    );

    expect(screen.getByTestId("icon-heading-1")).toBeInTheDocument();
    expect(screen.getByTestId("icon-bullet-list")).toBeInTheDocument();
    expect(screen.getByTestId("icon-code-block")).toBeInTheDocument();
  });

  it("renders the container with data-slot attribute", () => {
    const items = createMockItems();
    render(
      <CommandList
        command={vi.fn()}
        items={items}
        onRegisterKeyHandler={vi.fn()}
      />
    );

    const menu = document.querySelector('[data-slot="slash-command-menu"]');
    expect(menu).toBeInTheDocument();
  });

  it("highlights first item by default", () => {
    const items = createMockItems();
    render(
      <CommandList
        command={vi.fn()}
        items={items}
        onRegisterKeyHandler={vi.fn()}
      />
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons[0].className).toContain("bg-muted");
  });

  it("calls command with correct item on click", () => {
    const items = createMockItems();
    const command = vi.fn();
    render(
      <CommandList
        command={command}
        items={items}
        onRegisterKeyHandler={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("Bullet List"));
    expect(command).toHaveBeenCalledWith(items[1]);
  });

  it("prevents default on mouseDown", () => {
    const items = createMockItems();
    render(
      <CommandList
        command={vi.fn()}
        items={items}
        onRegisterKeyHandler={vi.fn()}
      />
    );

    const button = screen.getAllByRole("button")[0];
    const event = new MouseEvent("mousedown", { bubbles: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    button.dispatchEvent(event);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("registers keyboard handler on mount", () => {
    const items = createMockItems();
    const onRegisterKeyHandler = vi.fn();
    render(
      <CommandList
        command={vi.fn()}
        items={items}
        onRegisterKeyHandler={onRegisterKeyHandler}
      />
    );

    expect(onRegisterKeyHandler).toHaveBeenCalledWith(expect.any(Function));
  });

  describe("keyboard navigation", () => {
    it("ArrowDown moves selection down", () => {
      const items = createMockItems();
      let keyHandler: (event: KeyboardEvent) => boolean = () => false;
      const onRegisterKeyHandler = (
        handler: (event: KeyboardEvent) => boolean
      ) => {
        keyHandler = handler;
      };

      render(
        <CommandList
          command={vi.fn()}
          items={items}
          onRegisterKeyHandler={onRegisterKeyHandler}
        />
      );

      const result = keyHandler(
        new KeyboardEvent("keydown", { key: "ArrowDown" })
      );
      expect(result).toBe(true);
    });

    it("ArrowUp moves selection up (wraps around)", () => {
      const items = createMockItems();
      let keyHandler: (event: KeyboardEvent) => boolean = () => false;
      const onRegisterKeyHandler = (
        handler: (event: KeyboardEvent) => boolean
      ) => {
        keyHandler = handler;
      };

      render(
        <CommandList
          command={vi.fn()}
          items={items}
          onRegisterKeyHandler={onRegisterKeyHandler}
        />
      );

      const result = keyHandler(
        new KeyboardEvent("keydown", { key: "ArrowUp" })
      );
      expect(result).toBe(true);
    });

    it("Enter selects the current item", () => {
      const items = createMockItems();
      const command = vi.fn();
      let keyHandler: (event: KeyboardEvent) => boolean = () => false;
      const onRegisterKeyHandler = (
        handler: (event: KeyboardEvent) => boolean
      ) => {
        keyHandler = handler;
      };

      render(
        <CommandList
          command={command}
          items={items}
          onRegisterKeyHandler={onRegisterKeyHandler}
        />
      );

      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        cancelable: true,
      });
      const result = keyHandler(event);
      expect(result).toBe(true);
      expect(command).toHaveBeenCalledWith(items[0]);
    });

    it("unhandled key returns false", () => {
      const items = createMockItems();
      let keyHandler: (event: KeyboardEvent) => boolean = () => false;
      const onRegisterKeyHandler = (
        handler: (event: KeyboardEvent) => boolean
      ) => {
        keyHandler = handler;
      };

      render(
        <CommandList
          command={vi.fn()}
          items={items}
          onRegisterKeyHandler={onRegisterKeyHandler}
        />
      );

      const result = keyHandler(new KeyboardEvent("keydown", { key: "Tab" }));
      expect(result).toBe(false);
    });
  });

  it("resets selected index when items change", () => {
    const items = createMockItems();
    const command = vi.fn();
    let keyHandler: (event: KeyboardEvent) => boolean = () => false;
    const onRegisterKeyHandler = (
      handler: (event: KeyboardEvent) => boolean
    ) => {
      keyHandler = handler;
    };

    const { rerender } = render(
      <CommandList
        command={command}
        items={items}
        onRegisterKeyHandler={onRegisterKeyHandler}
      />
    );

    // Move down
    keyHandler(new KeyboardEvent("keydown", { key: "ArrowDown" }));

    // Change items
    const newItems = [items[0]];
    rerender(
      <CommandList
        command={command}
        items={newItems}
        onRegisterKeyHandler={onRegisterKeyHandler}
      />
    );

    // After items change, selection should reset to 0
    keyHandler(
      new KeyboardEvent("keydown", { key: "Enter", cancelable: true })
    );
    expect(command).toHaveBeenCalledWith(newItems[0]);
  });
});
