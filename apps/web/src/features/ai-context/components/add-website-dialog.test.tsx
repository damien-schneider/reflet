import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockCreateReference = vi.fn().mockResolvedValue(undefined);

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => mockCreateReference),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    website_references: {
      create: "website_references.create",
    },
  },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    type,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    type?: string;
    variant?: string;
  }) => (
    <button
      disabled={disabled}
      onClick={onClick}
      type={type as "button" | "submit"}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (o: boolean) => void;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
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

import { AddWebsiteDialog } from "./add-website-dialog";

afterEach(() => {
  cleanup();
  mockCreateReference.mockClear();
});

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  organizationId: "org1" as never,
};

describe("AddWebsiteDialog", () => {
  it("renders when open", () => {
    render(<AddWebsiteDialog {...baseProps} />);
    expect(screen.getByText("Add Website Reference")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<AddWebsiteDialog {...baseProps} open={false} />);
    expect(screen.queryByText("Add Website Reference")).not.toBeInTheDocument();
  });

  it("renders URL input field", () => {
    render(<AddWebsiteDialog {...baseProps} />);
    expect(screen.getByText("Website URL")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("https://example.com/docs")
    ).toBeInTheDocument();
  });

  it("renders Cancel and Add Website buttons", () => {
    render(<AddWebsiteDialog {...baseProps} />);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Add Website")).toBeInTheDocument();
  });

  it("disables Add button when URL is empty", () => {
    render(<AddWebsiteDialog {...baseProps} />);
    expect(screen.getByText("Add Website")).toBeDisabled();
  });

  it("enables Add button when URL has content", async () => {
    const user = userEvent.setup();
    render(<AddWebsiteDialog {...baseProps} />);

    await user.type(
      screen.getByPlaceholderText("https://example.com/docs"),
      "https://example.com"
    );
    expect(screen.getByText("Add Website")).not.toBeDisabled();
  });

  it("shows error for invalid URL", async () => {
    const user = userEvent.setup();
    render(<AddWebsiteDialog {...baseProps} />);

    await user.type(
      screen.getByPlaceholderText("https://example.com/docs"),
      "not-a-url"
    );
    fireEvent.submit(screen.getByText("Add Website").closest("form")!);

    expect(screen.getByText("Please enter a valid URL")).toBeInTheDocument();
  });

  it("shows error for non-http protocol", async () => {
    const user = userEvent.setup();
    render(<AddWebsiteDialog {...baseProps} />);

    await user.type(
      screen.getByPlaceholderText("https://example.com/docs"),
      "ftp://example.com"
    );
    fireEvent.submit(screen.getByText("Add Website").closest("form")!);

    expect(
      screen.getByText("URL must use http or https protocol")
    ).toBeInTheDocument();
  });

  it("shows error when URL is only whitespace", async () => {
    const user = userEvent.setup();
    const { container } = render(<AddWebsiteDialog {...baseProps} />);

    await user.type(
      screen.getByPlaceholderText("https://example.com/docs"),
      "   "
    );
    fireEvent.submit(container.querySelector("form")!);

    expect(screen.getByText("Please enter a URL")).toBeInTheDocument();
  });

  it("calls createReference with valid URL", async () => {
    const user = userEvent.setup();
    render(<AddWebsiteDialog {...baseProps} />);

    await user.type(
      screen.getByPlaceholderText("https://example.com/docs"),
      "https://example.com/docs"
    );
    await user.click(screen.getByText("Add Website"));

    expect(mockCreateReference).toHaveBeenCalledWith({
      organizationId: "org1",
      url: "https://example.com/docs",
    });
  });

  it("calls onOpenChange(false) on Cancel", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<AddWebsiteDialog {...baseProps} onOpenChange={onOpenChange} />);

    await user.click(screen.getByText("Cancel"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("clears error when user types again", async () => {
    const user = userEvent.setup();
    render(<AddWebsiteDialog {...baseProps} />);

    const input = screen.getByPlaceholderText("https://example.com/docs");
    await user.type(input, "invalid");
    fireEvent.submit(input.closest("form")!);
    expect(screen.getByText("Please enter a valid URL")).toBeInTheDocument();

    await user.type(input, "x");
    expect(
      screen.queryByText("Please enter a valid URL")
    ).not.toBeInTheDocument();
  });
});
