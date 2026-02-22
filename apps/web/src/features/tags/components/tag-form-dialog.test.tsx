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

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button
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

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (val: boolean) => void;
  }) =>
    open ? (
      <div data-testid="dialog" onClick={() => onOpenChange(false)}>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
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
    id,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      data-testid="tag-name-input"
      id={id}
      onChange={onChange}
      placeholder={placeholder}
      value={value}
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    className,
    htmlFor,
  }: {
    children: React.ReactNode;
    className?: string;
    htmlFor?: string;
  }) => (
    <label className={className} htmlFor={htmlFor}>
      {children}
    </label>
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

vi.mock("@/lib/tag-colors", () => ({
  isValidTagColor: (c: string) =>
    ["red", "blue", "green", "orange"].includes(c),
  migrateHexToNamedColor: () => "blue",
}));

import { TagFormDialog } from "./tag-form-dialog";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const ORG_ID = "org123" as Id<"organizations">;

describe("TagFormDialog", () => {
  const mockCreateTag = vi.fn().mockResolvedValue(undefined);
  const mockUpdateTag = vi.fn().mockResolvedValue(undefined);

  const defaultProps = {
    organizationId: ORG_ID,
    editingTag: null,
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

  it("renders dialog when open", () => {
    render(<TagFormDialog {...defaultProps} />);
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<TagFormDialog {...defaultProps} open={false} />);
    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
  });

  it("shows 'Create tag' title when no editing tag", () => {
    render(<TagFormDialog {...defaultProps} />);
    expect(screen.getByTestId("dialog-title")).toHaveTextContent("Create tag");
  });

  it("shows 'Edit tag' title when editing", () => {
    const editingTag = {
      _id: "tag1" as Id<"tags">,
      name: "Bug",
      color: "red",
    };
    render(<TagFormDialog {...defaultProps} editingTag={editingTag} />);
    expect(screen.getByTestId("dialog-title")).toHaveTextContent("Edit tag");
  });

  it("shows create description when no editing tag", () => {
    render(<TagFormDialog {...defaultProps} />);
    expect(screen.getByTestId("dialog-description")).toHaveTextContent(
      "Create a new tag to categorize feedback"
    );
  });

  it("shows edit description when editing", () => {
    const editingTag = {
      _id: "tag1" as Id<"tags">,
      name: "Bug",
      color: "red",
    };
    render(<TagFormDialog {...defaultProps} editingTag={editingTag} />);
    expect(screen.getByTestId("dialog-description")).toHaveTextContent(
      "Update the tag details"
    );
  });

  it("populates form with editing tag data", () => {
    const editingTag = {
      _id: "tag1" as Id<"tags">,
      name: "Bug",
      color: "red",
      icon: "🐛",
    };
    render(<TagFormDialog {...defaultProps} editingTag={editingTag} />);
    expect(screen.getByTestId("tag-name-input")).toHaveValue("Bug");
  });

  it("starts with empty name when creating new tag", () => {
    render(<TagFormDialog {...defaultProps} />);
    expect(screen.getByTestId("tag-name-input")).toHaveValue("");
  });

  it("renders input placeholder", () => {
    render(<TagFormDialog {...defaultProps} />);
    expect(screen.getByTestId("tag-name-input")).toHaveAttribute(
      "placeholder",
      "Tag name..."
    );
  });

  it("updates name on input change", () => {
    render(<TagFormDialog {...defaultProps} />);
    const input = screen.getByTestId("tag-name-input");
    fireEvent.change(input, { target: { value: "Feature" } });
    expect(input).toHaveValue("Feature");
  });

  it("renders emoji picker", () => {
    render(<TagFormDialog {...defaultProps} />);
    expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();
  });

  it("renders color picker", () => {
    render(<TagFormDialog {...defaultProps} />);
    expect(screen.getByTestId("color-picker")).toBeInTheDocument();
  });

  it("shows Create button when not editing", () => {
    render(<TagFormDialog {...defaultProps} />);
    expect(screen.getByText("Create")).toBeInTheDocument();
  });

  it("shows Save button when editing", () => {
    const editingTag = {
      _id: "tag1" as Id<"tags">,
      name: "Bug",
      color: "red",
    };
    render(<TagFormDialog {...defaultProps} editingTag={editingTag} />);
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("calls createTag when Create is clicked with valid name", async () => {
    const onSuccess = vi.fn();
    render(<TagFormDialog {...defaultProps} onSuccess={onSuccess} />);
    const input = screen.getByTestId("tag-name-input");
    fireEvent.change(input, { target: { value: "Bug" } });
    fireEvent.click(screen.getByText("Create"));
    expect(mockCreateTag).toHaveBeenCalledWith({
      organizationId: ORG_ID,
      name: "Bug",
      color: "blue",
      icon: undefined,
    });
  });

  it("does not call createTag when name is empty", () => {
    render(<TagFormDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("Create"));
    expect(mockCreateTag).not.toHaveBeenCalled();
  });

  it("does not call createTag when name is only whitespace", () => {
    render(<TagFormDialog {...defaultProps} />);
    const input = screen.getByTestId("tag-name-input");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(screen.getByText("Create"));
    expect(mockCreateTag).not.toHaveBeenCalled();
  });

  it("calls updateTag when Save is clicked in edit mode", async () => {
    const editingTag = {
      _id: "tag1" as Id<"tags">,
      name: "Bug",
      color: "red",
    };
    render(<TagFormDialog {...defaultProps} editingTag={editingTag} />);
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
    render(<TagFormDialog {...defaultProps} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("handles color change", () => {
    render(<TagFormDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("Pick Green"));
    // The color picker should update
    expect(screen.getByTestId("color-picker")).toHaveAttribute(
      "data-value",
      "green"
    );
  });

  it("handles emoji change", () => {
    render(<TagFormDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("Emoji"));
    expect(screen.getByTestId("emoji-picker")).toHaveAttribute(
      "data-value",
      "🎉"
    );
  });

  it("migrates hex color for editing tag", () => {
    const editingTag = {
      _id: "tag1" as Id<"tags">,
      name: "Bug",
      color: "#ff0000",
    };
    render(<TagFormDialog {...defaultProps} editingTag={editingTag} />);
    // Should migrate to "blue" based on our mock
    expect(screen.getByTestId("color-picker")).toHaveAttribute(
      "data-value",
      "blue"
    );
  });

  it("renders Cancel button", () => {
    render(<TagFormDialog {...defaultProps} />);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("calls onSuccess after successful create", async () => {
    const onSuccess = vi.fn();
    render(<TagFormDialog {...defaultProps} onSuccess={onSuccess} />);
    fireEvent.change(screen.getByTestId("tag-name-input"), {
      target: { value: "New Tag" },
    });
    fireEvent.click(screen.getByText("Create"));
    await vi.waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce();
    });
  });
});
