import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  } & Record<string, unknown>) => (
    <button disabled={disabled} onClick={onClick} type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@phosphor-icons/react", () => ({
  PaperPlaneRight: () => <svg data-testid="send-icon" />,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

import { ConversationComposer } from "./conversation-composer";

afterEach(cleanup);

describe("ConversationComposer", () => {
  it("shows collapsed state with placeholder", () => {
    render(<ConversationComposer isSubmitting={false} onSubmit={vi.fn()} />);
    expect(
      screen.getByPlaceholderText("What do you need help with?")
    ).toBeInTheDocument();
  });

  it("expands to show subject and send button on focus", async () => {
    const user = userEvent.setup();
    render(<ConversationComposer isSubmitting={false} onSubmit={vi.fn()} />);
    await user.click(
      screen.getByPlaceholderText("What do you need help with?")
    );
    expect(
      screen.getByPlaceholderText("Subject (optional)")
    ).toBeInTheDocument();
    expect(screen.getByText("Send")).toBeInTheDocument();
  });

  it("calls onSubmit with subject and message", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ConversationComposer isSubmitting={false} onSubmit={onSubmit} />);

    await user.click(
      screen.getByPlaceholderText("What do you need help with?")
    );

    await user.type(
      screen.getByPlaceholderText("Subject (optional)"),
      "Billing issue"
    );
    await user.type(
      screen.getByPlaceholderText("What do you need help with?"),
      "I need help"
    );
    await user.click(screen.getByText("Send"));

    expect(onSubmit).toHaveBeenCalledWith({
      subject: "Billing issue",
      message: "I need help",
      email: undefined,
    });
  });

  it("disables send when message is empty", async () => {
    const user = userEvent.setup();
    render(<ConversationComposer isSubmitting={false} onSubmit={vi.fn()} />);
    await user.click(
      screen.getByPlaceholderText("What do you need help with?")
    );
    expect(screen.getByText("Send").closest("button")).toBeDisabled();
  });

  it("disables form when isSubmitting", () => {
    render(<ConversationComposer isSubmitting={true} onSubmit={vi.fn()} />);
    expect(
      screen.getByPlaceholderText("What do you need help with?")
    ).toBeDisabled();
  });

  it("shows email field for guests and requires it to send", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onGuestEmailChange = vi.fn();
    render(
      <ConversationComposer
        alwaysExpanded
        guestEmail=""
        isGuest
        isSubmitting={false}
        onGuestEmailChange={onGuestEmailChange}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByPlaceholderText("Your email *")).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText("What do you need help with?"),
      "I need help"
    );

    // Send should be disabled without email
    expect(screen.getByText("Send").closest("button")).toBeDisabled();
  });

  it("calls onSubmit with email for guests", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <ConversationComposer
        alwaysExpanded
        guestEmail="test@example.com"
        isGuest
        isSubmitting={false}
        onGuestEmailChange={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    await user.type(
      screen.getByPlaceholderText("What do you need help with?"),
      "I need help"
    );
    await user.click(screen.getByText("Send"));

    expect(onSubmit).toHaveBeenCalledWith({
      subject: "",
      message: "I need help",
      email: "test@example.com",
    });
  });
});
