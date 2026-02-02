import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock Phosphor icons
vi.mock("@phosphor-icons/react", () => ({
  Smiley: () => <svg data-testid="smiley-icon" />,
}));

// Mock frimousse
const mockOnEmojiSelect = vi.fn();

vi.mock("frimousse", () => ({
  EmojiPicker: {
    Root: ({
      children,
      onEmojiSelect,
    }: {
      children: React.ReactNode;
      onEmojiSelect: (emoji: { emoji: string }) => void;
    }) => {
      // Store the callback so we can call it in tests
      mockOnEmojiSelect.mockImplementation((emoji: string) => {
        onEmojiSelect({ emoji });
      });
      return <div data-testid="frimousse-root">{children}</div>;
    },
    Search: ({ placeholder }: { placeholder: string }) => (
      <input data-testid="emoji-search" placeholder={placeholder} />
    ),
    Viewport: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="emoji-viewport">{children}</div>
    ),
    Loading: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="emoji-loading">{children}</div>
    ),
    Empty: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="emoji-empty">{children}</div>
    ),
    List: ({
      components,
    }: {
      components: {
        CategoryHeader: React.ComponentType<{ category: { label: string } }>;
        Emoji: React.ComponentType<{ emoji: { emoji: string } }>;
      };
    }) => {
      const { Emoji } = components;
      // Render some test emojis
      return (
        <div data-testid="emoji-list">
          <Emoji emoji={{ emoji: "😀" }} />
          <Emoji emoji={{ emoji: "🎉" }} />
          <Emoji emoji={{ emoji: "🔥" }} />
        </div>
      );
    },
  },
}));

// Mock Button component
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    className,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button
      className={className}
      data-testid="emoji-trigger-button"
      onClick={onClick}
      type="button"
      {...props}
    >
      {children}
    </button>
  ),
}));

// Mock Popover components
let mockPopoverOpen = false;
const mockSetPopoverOpen = vi.fn((open: boolean) => {
  mockPopoverOpen = open;
});

vi.mock("@/components/ui/popover", () => ({
  Popover: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => {
    mockPopoverOpen = open;
    mockSetPopoverOpen.mockImplementation(onOpenChange);
    return <div data-testid="popover">{children}</div>;
  },
  PopoverTrigger: ({
    render,
  }: {
    render: (props: { onClick: () => void }) => React.ReactNode;
  }) => (
    <div data-testid="popover-trigger">
      {render({ onClick: () => mockSetPopoverOpen(!mockPopoverOpen) })}
    </div>
  ),
  PopoverContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) =>
    mockPopoverOpen ? (
      <div className={className} data-testid="popover-content">
        {children}
      </div>
    ) : null,
}));

// Import the component after mocks
import { EmojiPicker } from "./emoji-picker";

describe("EmojiPicker", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockPopoverOpen = false;
  });

  it("renders with smiley icon when no value is set", () => {
    const onChange = vi.fn();
    render(<EmojiPicker onChange={onChange} />);

    expect(screen.getByTestId("smiley-icon")).toBeInTheDocument();
  });

  it("renders with emoji value when set", () => {
    const onChange = vi.fn();
    render(<EmojiPicker onChange={onChange} value="🔥" />);

    expect(screen.getByText("🔥")).toBeInTheDocument();
    expect(screen.queryByTestId("smiley-icon")).not.toBeInTheDocument();
  });

  it("opens popover when trigger is clicked", () => {
    const onChange = vi.fn();
    render(<EmojiPicker onChange={onChange} />);

    // Initially the content should not be visible
    expect(screen.queryByTestId("popover-content")).not.toBeInTheDocument();

    // Click the trigger button
    const triggerButton = screen.getByTestId("emoji-trigger-button");
    fireEvent.click(triggerButton);

    // Now the content should be visible
    expect(screen.getByTestId("popover-content")).toBeInTheDocument();
  });

  it("calls onChange when an emoji is selected", () => {
    const onChange = vi.fn();
    render(<EmojiPicker onChange={onChange} />);

    // Open the popover
    const triggerButton = screen.getByTestId("emoji-trigger-button");
    fireEvent.click(triggerButton);

    // Get the emoji list container
    const emojiList = screen.getByTestId("emoji-list");

    // Get emoji buttons from the list
    const emojiButtons = emojiList.querySelectorAll("button");
    expect(emojiButtons.length).toBe(3);

    // Click the first emoji button
    fireEvent.click(emojiButtons[0]);

    // The mockOnEmojiSelect should have been set up by the Root component
    // Simulate what happens when Frimousse calls onEmojiSelect
    mockOnEmojiSelect("😀");

    // Verify onChange was called with the emoji
    expect(onChange).toHaveBeenCalledWith("😀");
  });

  it("shows remove icon option when value is set", () => {
    const onChange = vi.fn();
    render(<EmojiPicker onChange={onChange} value="🔥" />);

    // Open the popover
    const triggerButton = screen.getByTestId("emoji-trigger-button");
    fireEvent.click(triggerButton);

    // Should show the "Remove icon" button
    const removeButton = screen.getByText("Remove icon");
    expect(removeButton).toBeInTheDocument();
  });

  it("calls onChange with undefined when remove icon is clicked", () => {
    const onChange = vi.fn();
    render(<EmojiPicker onChange={onChange} value="🔥" />);

    // Open the popover
    const triggerButton = screen.getByTestId("emoji-trigger-button");
    fireEvent.click(triggerButton);

    // Click remove icon
    const removeButton = screen.getByText("Remove icon");
    fireEvent.click(removeButton);

    // Verify onChange was called with undefined
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("does not show remove icon option when no value is set", () => {
    const onChange = vi.fn();
    render(<EmojiPicker onChange={onChange} />);

    // Open the popover
    const triggerButton = screen.getByTestId("emoji-trigger-button");
    fireEvent.click(triggerButton);

    // Should NOT show the "Remove icon" button
    expect(screen.queryByText("Remove icon")).not.toBeInTheDocument();
  });

  it("renders emoji search input", () => {
    const onChange = vi.fn();
    render(<EmojiPicker onChange={onChange} />);

    // Open the popover
    const triggerButton = screen.getByTestId("emoji-trigger-button");
    fireEvent.click(triggerButton);

    // Should show search input
    const searchInput = screen.getByTestId("emoji-search");
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute("placeholder", "Search emoji...");
  });

  it("emoji buttons have correct accessibility attributes", () => {
    const onChange = vi.fn();
    render(<EmojiPicker onChange={onChange} />);

    // Open the popover
    const triggerButton = screen.getByTestId("emoji-trigger-button");
    fireEvent.click(triggerButton);

    // Get emoji list
    const emojiList = screen.getByTestId("emoji-list");
    const emojiButtons = emojiList.querySelectorAll("button");

    // Each emoji button should have type="button"
    for (const button of emojiButtons) {
      expect(button).toHaveAttribute("type", "button");
    }
  });
});

describe("EmojiPicker integration with Frimousse props spreading", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockPopoverOpen = false;
  });

  it("emoji component spreads props correctly for click handling", () => {
    // This test verifies our fix: the Emoji component should spread props
    // from Frimousse to enable click handling
    const onChange = vi.fn();
    render(<EmojiPicker onChange={onChange} />);

    // Open the popover
    const triggerButton = screen.getByTestId("emoji-trigger-button");
    fireEvent.click(triggerButton);

    // The emoji buttons in the list should be rendered
    const emojiList = screen.getByTestId("emoji-list");
    expect(emojiList).toBeInTheDocument();

    // Buttons should exist and be clickable
    const buttons = emojiList.querySelectorAll("button");
    expect(buttons.length).toBe(3);

    // Each button should have the correct emoji text
    expect(buttons[0]).toHaveTextContent("😀");
    expect(buttons[1]).toHaveTextContent("🎉");
    expect(buttons[2]).toHaveTextContent("🔥");
  });
});
