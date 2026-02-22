import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@phosphor-icons/react", () => ({
  Plus: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-plus" />
  ),
  Tag: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-tag" />
  ),
  Trash: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-trash" />
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    style,
    variant,
  }: {
    children: React.ReactNode;
    style?: React.CSSProperties;
    variant?: string;
  }) => (
    <span data-variant={variant} style={style}>
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    size,
    variant,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    size?: string;
    variant?: string;
  }) => (
    <button
      data-size={size}
      data-variant={variant}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children: React.ReactNode;
    onValueChange?: (value: string) => void;
    value?: string;
  }) => <div data-testid="select">{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    id,
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    id?: string;
  }) => (
    <button
      aria-checked={checked}
      data-testid={`switch-${id}`}
      onClick={() => onCheckedChange(!checked)}
      role="switch"
      type="button"
    />
  ),
}));

vi.mock("@/components/ui/typography", () => ({
  Text: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
}));

import { LabelMappingsCard } from "./label-mappings-card";

afterEach(cleanup);

const defaultProps = {
  mappings: [],
  githubLabels: [],
  tags: [],
  isAdmin: true,
  isLoadingLabels: false,
  onAddMapping: vi.fn(),
  onDeleteMapping: vi.fn(),
  onFetchLabels: vi.fn(),
};

describe("LabelMappingsCard", () => {
  it("renders title", () => {
    render(<LabelMappingsCard {...defaultProps} />);
    expect(screen.getByText("Label Mappings")).toBeInTheDocument();
  });

  it("shows empty state when no mappings", () => {
    render(<LabelMappingsCard {...defaultProps} />);
    expect(
      screen.getByText("No label mappings configured")
    ).toBeInTheDocument();
  });

  it("shows Add Mapping button for admin", () => {
    render(<LabelMappingsCard {...defaultProps} />);
    expect(screen.getByText("Add Mapping")).toBeInTheDocument();
  });

  it("hides Add Mapping button for non-admin", () => {
    render(<LabelMappingsCard {...defaultProps} isAdmin={false} />);
    expect(screen.queryByText("Add Mapping")).toBeNull();
  });

  it("renders mappings when provided", () => {
    const mappings = [
      {
        _id: "map1" as never,
        githubLabelName: "bug",
        githubLabelColor: "ff0000",
        autoSync: true,
        tagName: "Bug",
        tagColor: "00ff00",
      },
    ];
    render(<LabelMappingsCard {...defaultProps} mappings={mappings} />);
    expect(screen.getByText("bug")).toBeInTheDocument();
    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText("Auto-sync")).toBeInTheDocument();
  });

  it("renders arrow between label and tag", () => {
    const mappings = [
      {
        _id: "map1" as never,
        githubLabelName: "feature",
        autoSync: false,
        tagName: "Feature",
      },
    ];
    render(<LabelMappingsCard {...defaultProps} mappings={mappings} />);
    expect(screen.getByText("→")).toBeInTheDocument();
  });

  it("does not show arrow when no tagName", () => {
    const mappings = [
      {
        _id: "map1" as never,
        githubLabelName: "feature",
        autoSync: false,
      },
    ];
    render(<LabelMappingsCard {...defaultProps} mappings={mappings} />);
    expect(screen.queryByText("→")).toBeNull();
  });

  it("shows delete button for admin on mappings", () => {
    const mappings = [
      {
        _id: "map1" as never,
        githubLabelName: "bug",
        autoSync: true,
      },
    ];
    render(<LabelMappingsCard {...defaultProps} mappings={mappings} />);
    expect(screen.getByTestId("icon-trash")).toBeInTheDocument();
  });

  it("hides delete button for non-admin on mappings", () => {
    const mappings = [
      {
        _id: "map1" as never,
        githubLabelName: "bug",
        autoSync: true,
      },
    ];
    render(
      <LabelMappingsCard
        {...defaultProps}
        isAdmin={false}
        mappings={mappings}
      />
    );
    expect(screen.queryByTestId("icon-trash")).toBeNull();
  });

  it("calls onDeleteMapping when delete is clicked", async () => {
    const onDeleteMapping = vi.fn();
    const user = userEvent.setup();
    const mappings = [
      {
        _id: "map1" as never,
        githubLabelName: "bug",
        autoSync: false,
      },
    ];
    render(
      <LabelMappingsCard
        {...defaultProps}
        mappings={mappings}
        onDeleteMapping={onDeleteMapping}
      />
    );
    // The delete button wraps the trash icon
    const trashIcon = screen.getByTestId("icon-trash");
    await user.click(trashIcon.closest("button")!);
    expect(onDeleteMapping).toHaveBeenCalledWith("map1");
  });

  it("opens dialog when Add Mapping clicked", async () => {
    const user = userEvent.setup();
    render(<LabelMappingsCard {...defaultProps} />);
    await user.click(screen.getByText("Add Mapping"));
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getByText("Add Label Mapping")).toBeInTheDocument();
  });

  it("calls onFetchLabels when dialog opens with no labels", async () => {
    const onFetchLabels = vi.fn();
    const user = userEvent.setup();
    render(
      <LabelMappingsCard {...defaultProps} onFetchLabels={onFetchLabels} />
    );
    await user.click(screen.getByText("Add Mapping"));
    expect(onFetchLabels).toHaveBeenCalled();
  });
});
