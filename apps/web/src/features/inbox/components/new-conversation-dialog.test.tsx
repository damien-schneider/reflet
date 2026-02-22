import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    ...rest
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button disabled={disabled} onClick={onClick} type="button">
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
  DialogContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
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

vi.mock("@/components/ui/textarea", () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
}));

vi.mock("@phosphor-icons/react", () => ({
  PaperPlaneRight: () => <svg data-testid="send-icon" />,
}));

import { NewConversationDialog } from "./new-conversation-dialog";

afterEach(cleanup);

const baseProps = {
  organizationId: "org1" as never,
  open: true,
  onOpenChange: vi.fn(),
  onSubmit: vi.fn().mockResolvedValue("conv-123"),
};

describe("NewConversationDialog", () => {
  it("renders when open", () => {
    render(<NewConversationDialog {...baseProps} />);
    expect(screen.getByText("New conversation")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<NewConversationDialog {...baseProps} open={false} />);
    expect(screen.queryByText("New conversation")).not.toBeInTheDocument();
  });

  it("renders subject and message fields", () => {
    render(<NewConversationDialog {...baseProps} />);
    expect(screen.getByText("Subject (optional)")).toBeInTheDocument();
    expect(screen.getByText("Message")).toBeInTheDocument();
  });

  it("renders Cancel and Send buttons", () => {
    render(<NewConversationDialog {...baseProps} />);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Send message")).toBeInTheDocument();
  });

  it("disables Send button when message is empty", () => {
    render(<NewConversationDialog {...baseProps} />);
    const sendButton = screen.getByText("Send message");
    expect(sendButton).toBeDisabled();
  });

  it("enables Send button when message has content", async () => {
    const user = userEvent.setup();
    render(<NewConversationDialog {...baseProps} />);

    await user.type(
      screen.getByPlaceholderText("Describe your issue or question..."),
      "I need help"
    );
    expect(screen.getByText("Send message")).not.toBeDisabled();
  });

  it("calls onSubmit with form data on send", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue("conv-123");
    render(<NewConversationDialog {...baseProps} onSubmit={onSubmit} />);

    await user.type(
      screen.getByPlaceholderText("What's this about?"),
      "Billing question"
    );
    await user.type(
      screen.getByPlaceholderText("Describe your issue or question..."),
      "Help me"
    );
    await user.click(screen.getByText("Send message"));

    expect(onSubmit).toHaveBeenCalledWith({
      organizationId: "org1",
      subject: "Billing question",
      initialMessage: "Help me",
    });
  });

  it("calls onSuccess with conversation ID after submission", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<NewConversationDialog {...baseProps} onSuccess={onSuccess} />);

    await user.type(
      screen.getByPlaceholderText("Describe your issue or question..."),
      "Help"
    );
    await user.click(screen.getByText("Send message"));

    expect(onSuccess).toHaveBeenCalledWith("conv-123");
  });

  it("calls onOpenChange(false) on Cancel click", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <NewConversationDialog {...baseProps} onOpenChange={onOpenChange} />
    );

    await user.click(screen.getByText("Cancel"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("submits with undefined subject when subject is blank", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue("conv-456");
    render(<NewConversationDialog {...baseProps} onSubmit={onSubmit} />);

    await user.type(
      screen.getByPlaceholderText("Describe your issue or question..."),
      "My issue"
    );
    await user.click(screen.getByText("Send message"));

    expect(onSubmit).toHaveBeenCalledWith({
      organizationId: "org1",
      subject: undefined,
      initialMessage: "My issue",
    });
  });
});
