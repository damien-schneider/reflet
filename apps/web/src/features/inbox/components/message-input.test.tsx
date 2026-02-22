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
    <button disabled={disabled} onClick={onClick} type="button" {...rest}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("@phosphor-icons/react", () => ({
  PaperPlaneRight: () => <svg data-testid="send-icon" />,
}));

import { MessageInput } from "./message-input";

afterEach(cleanup);

describe("MessageInput", () => {
  it("renders textarea with default placeholder", () => {
    render(<MessageInput onSend={vi.fn()} />);
    expect(
      screen.getByPlaceholderText("Type your message...")
    ).toBeInTheDocument();
  });

  it("renders with custom placeholder", () => {
    render(<MessageInput onSend={vi.fn()} placeholder="Write a reply..." />);
    expect(screen.getByPlaceholderText("Write a reply...")).toBeInTheDocument();
  });

  it("disables send button when message is empty", () => {
    render(<MessageInput onSend={vi.fn()} />);
    const sendButton = screen.getByRole("button", { name: "Send message" });
    expect(sendButton).toBeDisabled();
  });

  it("enables send button when message has content", async () => {
    const user = userEvent.setup();
    render(<MessageInput onSend={vi.fn()} />);

    await user.type(screen.getByRole("textbox"), "Hello");
    expect(screen.getByText("Send message")).not.toBeDisabled();
  });

  it("calls onSend with trimmed message on button click", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} />);

    await user.type(screen.getByRole("textbox"), "  Hello world  ");
    await user.click(screen.getByText("Send message"));

    expect(onSend).toHaveBeenCalledWith("Hello world");
  });

  it("clears textarea after successful send", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<MessageInput onSend={onSend} />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Hello");
    await user.click(screen.getByText("Send message"));

    expect(textarea).toHaveValue("");
  });

  it("sends message on Enter key press", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Hello{Enter}");

    expect(onSend).toHaveBeenCalledWith("Hello");
  });

  it("does not send on Shift+Enter (allows newline)", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Hello{Shift>}{Enter}{/Shift}");

    expect(onSend).not.toHaveBeenCalled();
  });

  it("does not send empty messages", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} />);

    await user.type(screen.getByRole("textbox"), "   ");
    await user.click(screen.getByText("Send message"));

    expect(onSend).not.toHaveBeenCalled();
  });

  it("disables everything when disabled prop is true", () => {
    render(<MessageInput disabled={true} onSend={vi.fn()} />);
    expect(screen.getByRole("textbox")).toBeDisabled();
    const sendButton = screen.getByRole("button", { name: "Send message" });
    expect(sendButton).toBeDisabled();
  });

  it("does not send on Enter when message is empty", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "{Enter}");

    expect(onSend).not.toHaveBeenCalled();
  });

  it("has accessible send button with sr-only text", () => {
    render(<MessageInput onSend={vi.fn()} />);
    expect(screen.getByText("Send message")).toBeInTheDocument();
  });
});
