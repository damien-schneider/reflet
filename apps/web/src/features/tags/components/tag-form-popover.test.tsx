import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    tag_manager_actions: {
      create: "tag_manager_actions:create",
      update: "tag_manager_actions:update",
    },
  },
}));

vi.mock("@phosphor-icons/react", () => ({
  Plus: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="plus-icon" />
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    size,
    className,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => (
    <button
      className={className}
      data-size={size}
      data-variant={variant}
      disabled={disabled}
      onClick={onClick}
      type="button"
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/emoji-picker", () => ({
  EmojiPicker: ({
    value,
    onChange,
  }: {
    value?: string;
    onChange: (v: string) => void;
  }) => (
    <button
      data-testid="emoji-picker"
      data-value={value}
      onClick={() => onChange("🎉")}
      type="button"
    >
      Emoji
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    onKeyDown,
    autoFocus,
    className,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      className={className}
      data-testid="tag-name-input"
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      value={value}
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/notion-color-picker", () => ({
  NotionColorPicker: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <div data-testid="color-picker" data-value={value}>
      <button onClick={() => onChange("green")} type="button">
        Pick Green
      </button>
    </div>
  ),
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (val: boolean) => void;
  }) =>
    open ? (
      <div data-testid="popover" onClick={() => onOpenChange(!open)}>
        {children}
      </div>
    ) : null,
  PopoverContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
    align?: string;
  }) => (
    <div className={className} data-testid="popover-content">
      {children}
    </div>
  ),
  PopoverTrigger: ({
    render,
    nativeButton,
    className,
    onClick,
    ...props
  }: {
    render?: (props: Record<string, unknown>) => React.ReactNode;
    children?: React.ReactNode;
    nativeButton?: boolean;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
  }) => {
    if (render) {
      return <>{render({ ...props, onClick, className })}</>;
    }
    return null;
  },
}));

vi.mock("@/lib/tag-colors", () => ({
  isValidTagColor: (c: string) =>
    ["red", "blue", "green", "orange"].includes(c),
  migrateHexToNamedColor: () => "blue",
}));

import { TagFormPopover } from "./tag-form-popover";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const ORG_ID = "org123" as Id<"organizations">;

describe("TagFormPopover", () => {
  const mockCreateTag = vi.fn().mockResolvedValue(undefined);
  const mockUpdateTag = vi.fn().mockResolvedValue(undefined);

  const defaultProps = {
    organizationId: ORG_ID,
    open: true,
    onOpenChange: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    mockUseMutation.mockImplementation((mutationName: string) => {
      if (mutationName === "tag_manager_actions:create") {
        return mockCreateTag;
      }
      if (mutationName === "tag_manager_actions:update") {
        return mockUpdateTag;
      }
      return vi.fn();
    });
  });

  it("renders popover when open", () => {
    render(<TagFormPopover {...defaultProps} />);
    expect(screen.getByTestId("popover")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<TagFormPopover {...defaultProps} open={false} />);
    expect(screen.queryByTestId("popover")).not.toBeInTheDocument();
  });

  it("renders tag name input", () => {
    render(<TagFormPopover {...defaultProps} />);
    expect(screen.getByTestId("tag-name-input")).toBeInTheDocument();
    expect(screen.getByTestId("tag-name-input")).toHaveAttribute(
      "placeholder",
      "Tag name..."
    );
  });

  it("renders emoji picker", () => {
    render(<TagFormPopover {...defaultProps} />);
    expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();
  });

  it("renders color picker", () => {
    render(<TagFormPopover {...defaultProps} />);
    expect(screen.getByTestId("color-picker")).toBeInTheDocument();
  });

  it("shows Create button when not editing", () => {
    render(<TagFormPopover {...defaultProps} />);
    expect(screen.getByText("Create")).toBeInTheDocument();
  });

  it("shows Save button when editing", () => {
    const editingTag = {
      _id: "tag1" as Id<"tags">,
      name: "Bug",
      color: "red",
    };
    render(<TagFormPopover {...defaultProps} editingTag={editingTag} />);
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("updates name on input change", () => {
    render(<TagFormPopover {...defaultProps} />);
    const input = screen.getByTestId("tag-name-input");
    fireEvent.change(input, { target: { value: "Feature" } });
    expect(input).toHaveValue("Feature");
  });

  it("calls createTag on Create click with valid name", () => {
    render(<TagFormPopover {...defaultProps} />);
    fireEvent.change(screen.getByTestId("tag-name-input"), {
      target: { value: "Bug" },
    });
    fireEvent.click(screen.getByText("Create"));
    expect(mockCreateTag).toHaveBeenCalledWith({
      organizationId: ORG_ID,
      name: "Bug",
      color: "blue",
      icon: undefined,
    });
  });

  it("does not call createTag when name is empty", () => {
    render(<TagFormPopover {...defaultProps} />);
    fireEvent.click(screen.getByText("Create"));
    expect(mockCreateTag).not.toHaveBeenCalled();
  });

  it("calls updateTag when editing and Save is clicked", () => {
    const editingTag = {
      _id: "tag1" as Id<"tags">,
      name: "Bug",
      color: "red",
    };
    render(<TagFormPopover {...defaultProps} editingTag={editingTag} />);
    fireEvent.click(screen.getByText("Save"));
    expect(mockUpdateTag).toHaveBeenCalledWith({
      id: "tag1",
      name: "Bug",
      color: "red",
      icon: undefined,
    });
  });

  it("calls onOpenChange(false) when Cancel is clicked", () => {
    const onOpenChange = vi.fn();
    render(<TagFormPopover {...defaultProps} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("submits on Enter key press", () => {
    render(<TagFormPopover {...defaultProps} />);
    const input = screen.getByTestId("tag-name-input");
    fireEvent.change(input, { target: { value: "Bug" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockCreateTag).toHaveBeenCalled();
  });

  it("does not submit on Shift+Enter", () => {
    render(<TagFormPopover {...defaultProps} />);
    const input = screen.getByTestId("tag-name-input");
    fireEvent.change(input, { target: { value: "Bug" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(mockCreateTag).not.toHaveBeenCalled();
  });

  it("populates form with editing tag data", () => {
    const editingTag = {
      _id: "tag1" as Id<"tags">,
      name: "Feature",
      color: "green",
      icon: "✨",
    };
    render(<TagFormPopover {...defaultProps} editingTag={editingTag} />);
    expect(screen.getByTestId("tag-name-input")).toHaveValue("Feature");
    expect(screen.getByTestId("color-picker")).toHaveAttribute(
      "data-value",
      "green"
    );
  });

  it("migrates hex color for editing tag", () => {
    const editingTag = {
      _id: "tag1" as Id<"tags">,
      name: "Bug",
      color: "#ff0000",
    };
    render(<TagFormPopover {...defaultProps} editingTag={editingTag} />);
    expect(screen.getByTestId("color-picker")).toHaveAttribute(
      "data-value",
      "blue"
    );
  });

  it("disables Create button when name is empty", () => {
    render(<TagFormPopover {...defaultProps} />);
    const createBtn = screen.getByText("Create");
    expect(createBtn).toBeDisabled();
  });

  it("renders plus icon in default trigger", () => {
    render(<TagFormPopover {...defaultProps} />);
    expect(screen.getByTestId("plus-icon")).toBeInTheDocument();
  });

  it("resets form when editingTag changes to null", () => {
    const editingTag = {
      _id: "tag1" as Id<"tags">,
      name: "Bug",
      color: "red",
    };
    const { rerender } = render(
      <TagFormPopover {...defaultProps} editingTag={editingTag} />
    );
    expect(screen.getByTestId("tag-name-input")).toHaveValue("Bug");

    rerender(<TagFormPopover {...defaultProps} editingTag={null} />);
    expect(screen.getByTestId("tag-name-input")).toHaveValue("");
  });

  it("calls onSuccess after successful creation", async () => {
    const onSuccess = vi.fn();
    render(<TagFormPopover {...defaultProps} onSuccess={onSuccess} />);
    fireEvent.change(screen.getByTestId("tag-name-input"), {
      target: { value: "New Tag" },
    });
    fireEvent.click(screen.getByText("Create"));
    await vi.waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce();
    });
  });
});
