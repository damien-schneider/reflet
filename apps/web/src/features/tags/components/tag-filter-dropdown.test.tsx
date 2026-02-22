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
  Check: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="check-icon" />
  ),
  Pencil: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="pencil-icon" />
  ),
  Plus: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="plus-icon" />
  ),
  Tag: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="tag-icon" />
  ),
  Trash: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="trash-icon" />
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    variant,
    className,
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
  }) => (
    <span className={className} data-testid="badge" data-variant={variant}>
      {children}
    </span>
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

vi.mock("@/components/ui/command", () => ({
  Command: ({
    children,
    shouldFilter,
  }: {
    children: React.ReactNode;
    shouldFilter?: boolean;
  }) => (
    <div data-filter={shouldFilter} data-testid="command">
      {children}
    </div>
  ),
  CommandEmpty: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command-empty">{children}</div>
  ),
  CommandGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command-group">{children}</div>
  ),
  CommandInput: ({
    value,
    onValueChange,
    placeholder,
  }: {
    value: string;
    onValueChange: (val: string) => void;
    placeholder?: string;
  }) => (
    <input
      data-testid="command-input"
      onChange={(e) => onValueChange(e.target.value)}
      placeholder={placeholder}
      value={value}
    />
  ),
  CommandItem: ({
    children,
    onSelect,
    value,
    className,
    disabled,
    ...rest
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
    value?: string;
    className?: string;
    disabled?: boolean;
    "data-checked"?: boolean;
  }) => (
    <div
      className={className}
      data-disabled={disabled}
      data-testid="command-item"
      data-value={value}
      onClick={onSelect}
      {...rest}
    >
      {children}
    </div>
  ),
  CommandList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command-list">{children}</div>
  ),
  CommandSeparator: () => <hr data-testid="command-separator" />,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input data-testid="edit-input" {...props} />
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
        Pick Color
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
  }) => (
    <div data-open={open} data-testid="popover">
      {children}
    </div>
  ),
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
    children,
    className,
    onClick,
    ...props
  }: {
    render?: (props: Record<string, unknown>) => React.ReactNode;
    children?: React.ReactNode;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
  }) => {
    if (render) {
      return (
        <div data-testid="popover-trigger">
          {render({ ...props, onClick, className })}
          {children}
        </div>
      );
    }
    return <>{children}</>;
  },
}));

vi.mock("@/lib/tag-colors", () => ({
  getRandomTagColor: () => "orange",
  getTagDotColor: (color: string) => `dot-${color}`,
  isValidTagColor: (c: string) =>
    ["red", "blue", "green", "orange"].includes(c),
  migrateHexToNamedColor: () => "blue",
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("./delete-tag-dialog", () => ({
  DeleteTagDialog: ({
    tagId,
    onOpenChange,
    onSuccess,
  }: {
    tagId: string | null;
    onOpenChange: (v: boolean) => void;
    onSuccess: () => void;
  }) =>
    tagId ? (
      <div data-testid="delete-dialog">
        <button onClick={onSuccess} type="button">
          Confirm Delete
        </button>
      </div>
    ) : null,
}));

import { TagFilterDropdown } from "./tag-filter-dropdown";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const ORG_ID = "org123" as Id<"organizations">;

const makeTags = () => [
  { _id: "tag1" as Id<"tags">, name: "Bug", color: "red" },
  { _id: "tag2" as Id<"tags">, name: "Feature", color: "blue" },
  { _id: "tag3" as Id<"tags">, name: "Improvement", color: "green" },
];

describe("TagFilterDropdown", () => {
  const mockCreateTag = vi.fn().mockResolvedValue(undefined);
  const mockUpdateTag = vi.fn().mockResolvedValue(undefined);

  const defaultProps = {
    organizationId: ORG_ID,
    tags: makeTags(),
    selectedTagIds: [] as string[],
    onTagChange: vi.fn(),
    isAdmin: false,
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

  it("renders the Tags trigger button", () => {
    render(<TagFilterDropdown {...defaultProps} />);
    expect(screen.getByText("Tags")).toBeInTheDocument();
  });

  it("renders tag icon", () => {
    render(<TagFilterDropdown {...defaultProps} />);
    expect(screen.getByTestId("tag-icon")).toBeInTheDocument();
  });

  it("shows selection count badge when tags are selected", () => {
    render(
      <TagFilterDropdown {...defaultProps} selectedTagIds={["tag1", "tag2"]} />
    );
    expect(screen.getByTestId("badge")).toHaveTextContent("2");
  });

  it("does not show badge when no tags are selected", () => {
    render(<TagFilterDropdown {...defaultProps} />);
    expect(screen.queryByTestId("badge")).not.toBeInTheDocument();
  });

  it("renders all tags in the list", () => {
    render(<TagFilterDropdown {...defaultProps} />);
    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText("Feature")).toBeInTheDocument();
    expect(screen.getByText("Improvement")).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(<TagFilterDropdown {...defaultProps} />);
    expect(screen.getByTestId("command-input")).toBeInTheDocument();
    expect(screen.getByTestId("command-input")).toHaveAttribute(
      "placeholder",
      "Search or create tags..."
    );
  });

  it("filters tags based on search input", () => {
    render(<TagFilterDropdown {...defaultProps} />);
    const input = screen.getByTestId("command-input");
    fireEvent.change(input, { target: { value: "Bug" } });
    const items = screen.getAllByTestId("command-item");
    // Should show Bug + possibly create option
    const tagItems = items.filter(
      (i) => !i.getAttribute("data-value")?.startsWith("create-")
    );
    expect(tagItems).toHaveLength(1);
  });

  it("calls onTagChange when a tag is clicked", () => {
    const onTagChange = vi.fn();
    render(<TagFilterDropdown {...defaultProps} onTagChange={onTagChange} />);
    const bugItem = screen
      .getByText("Bug")
      .closest("[data-testid='command-item']");
    fireEvent.click(bugItem!);
    expect(onTagChange).toHaveBeenCalledWith("tag1", true);
  });

  it("calls onTagChange with false to deselect", () => {
    const onTagChange = vi.fn();
    render(
      <TagFilterDropdown
        {...defaultProps}
        onTagChange={onTagChange}
        selectedTagIds={["tag1"]}
      />
    );
    const bugItem = screen
      .getByText("Bug")
      .closest("[data-testid='command-item']");
    fireEvent.click(bugItem!);
    expect(onTagChange).toHaveBeenCalledWith("tag1", false);
  });

  it("shows check marks for selected tags", () => {
    render(<TagFilterDropdown {...defaultProps} selectedTagIds={["tag1"]} />);
    const checkIcons = screen.getAllByTestId("check-icon");
    expect(checkIcons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows 'No tags found' message for non-admin", () => {
    render(<TagFilterDropdown {...defaultProps} />);
    expect(screen.getByText("No tags found.")).toBeInTheDocument();
  });

  it("shows 'Type to create' message for admin", () => {
    render(<TagFilterDropdown {...defaultProps} isAdmin />);
    expect(
      screen.getByText("No tags found. Type to create.")
    ).toBeInTheDocument();
  });

  it("shows create option when admin types new tag name", () => {
    render(<TagFilterDropdown {...defaultProps} isAdmin />);
    const input = screen.getByTestId("command-input");
    fireEvent.change(input, { target: { value: "NewTag" } });
    expect(screen.getByText(/Create "NewTag"/)).toBeInTheDocument();
  });

  it("does not show create option when tag name already exists", () => {
    render(<TagFilterDropdown {...defaultProps} isAdmin />);
    const input = screen.getByTestId("command-input");
    fireEvent.change(input, { target: { value: "Bug" } });
    expect(screen.queryByText(/Create "Bug"/)).not.toBeInTheDocument();
  });

  it("does not show create option for non-admin", () => {
    render(<TagFilterDropdown {...defaultProps} />);
    const input = screen.getByTestId("command-input");
    fireEvent.change(input, { target: { value: "NewTag" } });
    expect(screen.queryByText(/Create/)).not.toBeInTheDocument();
  });

  it("calls createTag when create option is clicked", () => {
    render(<TagFilterDropdown {...defaultProps} isAdmin />);
    const input = screen.getByTestId("command-input");
    fireEvent.change(input, { target: { value: "NewTag" } });
    const createItem = screen
      .getByText(/Create "NewTag"/)
      .closest("[data-testid='command-item']");
    fireEvent.click(createItem!);
    expect(mockCreateTag).toHaveBeenCalledWith({
      organizationId: ORG_ID,
      name: "NewTag",
      color: "orange",
    });
  });

  it("renders with empty tags array", () => {
    render(<TagFilterDropdown {...defaultProps} tags={[]} />);
    expect(screen.getByText("Tags")).toBeInTheDocument();
    expect(screen.queryByText("Bug")).not.toBeInTheDocument();
  });

  it("shows tag with icon when present", () => {
    const tags = [
      { _id: "tag1" as Id<"tags">, name: "Bug", color: "red", icon: "🐛" },
    ];
    render(<TagFilterDropdown {...defaultProps} tags={tags} />);
    expect(screen.getByText("🐛")).toBeInTheDocument();
  });

  it("handles case-insensitive search", () => {
    render(<TagFilterDropdown {...defaultProps} />);
    const input = screen.getByTestId("command-input");
    fireEvent.change(input, { target: { value: "bug" } });
    const items = screen.getAllByTestId("command-item");
    const tagItems = items.filter(
      (i) => !i.getAttribute("data-value")?.startsWith("create-")
    );
    expect(tagItems).toHaveLength(1);
    expect(screen.getByText("Bug")).toBeInTheDocument();
  });

  it("does not show create when search is empty", () => {
    render(<TagFilterDropdown {...defaultProps} isAdmin />);
    expect(screen.queryByTestId("command-separator")).not.toBeInTheDocument();
  });

  it("shows edit button for admin", () => {
    render(<TagFilterDropdown {...defaultProps} isAdmin />);
    const pencilIcons = screen.getAllByTestId("pencil-icon");
    expect(pencilIcons.length).toBeGreaterThan(0);
  });

  it("does not show edit button for non-admin", () => {
    render(<TagFilterDropdown {...defaultProps} />);
    expect(screen.queryByTestId("pencil-icon")).not.toBeInTheDocument();
  });

  it("shows trash button for admin", () => {
    render(<TagFilterDropdown {...defaultProps} isAdmin />);
    const trashIcons = screen.getAllByTestId("trash-icon");
    expect(trashIcons.length).toBeGreaterThan(0);
  });

  it("does not show trash button for non-admin", () => {
    render(<TagFilterDropdown {...defaultProps} />);
    expect(screen.queryByTestId("trash-icon")).not.toBeInTheDocument();
  });

  it("renders with single tag selected", () => {
    render(<TagFilterDropdown {...defaultProps} selectedTagIds={["tag1"]} />);
    expect(screen.getByTestId("badge")).toHaveTextContent("1");
  });

  it("shows create option when typing a new tag name", () => {
    render(<TagFilterDropdown {...defaultProps} isAdmin />);
    const input = screen.getByTestId("command-input");
    fireEvent.change(input, { target: { value: "NewTag" } });
    expect(screen.getByText(/Create "NewTag"/)).toBeInTheDocument();
  });

  it("renders color dot for each tag", () => {
    render(<TagFilterDropdown {...defaultProps} />);
    // Each tag should have a dot-{color} styled element
    const items = screen.getAllByTestId("command-item");
    expect(items.length).toBeGreaterThanOrEqual(3);
  });

  it("shows delete dialog when trash is clicked for admin", () => {
    render(<TagFilterDropdown {...defaultProps} isAdmin />);
    const trashIcons = screen.getAllByTestId("trash-icon");
    const button = trashIcons[0].closest("button");
    fireEvent.click(button!);
    expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
  });

  it("handles tags with long names", () => {
    const tags = [
      {
        _id: "tag1" as Id<"tags">,
        name: "Very Long Tag Name That Should Still Display",
        color: "red",
      },
    ];
    render(<TagFilterDropdown {...defaultProps} tags={tags} />);
    expect(
      screen.getByText("Very Long Tag Name That Should Still Display")
    ).toBeInTheDocument();
  });
});
