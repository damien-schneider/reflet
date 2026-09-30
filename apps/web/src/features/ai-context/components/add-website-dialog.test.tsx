import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockCreateReference = vi.fn().mockResolvedValue(undefined);

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => mockCreateReference),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    integrations: {
      website_references: {
        create: "website_references.create",
      },
    },
  },
}));

vi.mock("@ctrl-ui/react/ui/button", () => ({
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

vi.mock("@ctrl-ui/react/ui/dialog", () => ({
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

vi.mock("@ctrl-ui/react/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

import { AddWebsiteDialog } from "./add-website-dialog";

afterEach(() => {
  mockCreateReference.mockClear();
});

const baseProps = {
  onOpenChange: vi.fn(),
  open: true,
  organizationId: "org1" as never,
};

describe("AddWebsiteDialog", () => {
  it("renders when open", () => {
    render(<AddWebsiteDialog {...baseProps} />);
    expect(screen.getByText("Add website reference")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<AddWebsiteDialog {...baseProps} open={false} />);
    expect(screen.queryByText("Add website reference")).not.toBeInTheDocument();
  });

  it("renders URL input field", () => {
    render(<AddWebsiteDialog {...baseProps} />);
    expect(screen.getByLabelText("Website URL")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("https://example.com/docs")
    ).toBeInTheDocument();
  });

  it("renders Cancel and Add website buttons", () => {
    render(<AddWebsiteDialog {...baseProps} />);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Add website")).toBeInTheDocument();
  });

  it("disables Add button when URL is empty", () => {
    render(<AddWebsiteDialog {...baseProps} />);
    expect(screen.getByText("Add website")).toBeDisabled();
  });

  it("enables Add button when URL has content", async () => {
    const user = userEvent.setup();
    render(<AddWebsiteDialog {...baseProps} />);

    await user.type(
      screen.getByPlaceholderText("https://example.com/docs"),
      "https://example.com"
    );
    expect(screen.getByText("Add website")).not.toBeDisabled();
  });

  it("shows error for invalid URL", async () => {
    const user = userEvent.setup();
    render(<AddWebsiteDialog {...baseProps} />);

    await user.type(
      screen.getByPlaceholderText("https://example.com/docs"),
      "not-a-url"
    );
    fireEvent.submit(screen.getByText("Add website").closest("form")!);

    expect(
      screen.getByText("Enter a valid URL, like https://example.com/docs")
    ).toBeInTheDocument();
  });

  it("shows error for non-http protocol", async () => {
    const user = userEvent.setup();
    render(<AddWebsiteDialog {...baseProps} />);

    await user.type(
      screen.getByPlaceholderText("https://example.com/docs"),
      "ftp://example.com"
    );
    fireEvent.submit(screen.getByText("Add website").closest("form")!);

    expect(
      screen.getByText("Use a URL that starts with http:// or https://")
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

    expect(screen.getByText("Enter a URL")).toBeInTheDocument();
  });

  it("calls createReference with valid URL", async () => {
    const user = userEvent.setup();
    render(<AddWebsiteDialog {...baseProps} />);

    await user.type(
      screen.getByPlaceholderText("https://example.com/docs"),
      "https://example.com/docs"
    );
    await user.click(screen.getByText("Add website"));

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
    expect(
      screen.getByText("Enter a valid URL, like https://example.com/docs")
    ).toBeInTheDocument();

    await user.type(input, "x");
    expect(
      screen.queryByText("Enter a valid URL, like https://example.com/docs")
    ).not.toBeInTheDocument();
  });
});
