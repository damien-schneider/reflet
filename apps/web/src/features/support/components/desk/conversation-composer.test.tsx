import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@ctrl-ui/react/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock("@ctrl-ui/react/ui/textarea", () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
}));

vi.mock("@ctrl-ui/react/ui/field", () => ({
  Field: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FieldError: ({
    children,
    id,
    match,
  }: {
    children: React.ReactNode;
    id?: string;
    match?: boolean;
  }) => (match ? <p id={id}>{children}</p> : null),
  FieldLabel: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock("@ctrl-ui/react/ui/spinner", () => ({
  Spinner: () => <svg data-testid="spinner" />,
}));

vi.mock("@ctrl-ui/react/ui/button", () => ({
  Button: ({
    children,
    disabled,
    type,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    type?: "submit" | "button";
  }) => (
    <button disabled={disabled} type={type === "submit" ? "submit" : "button"}>
      {children}
    </button>
  ),
}));

vi.mock("@phosphor-icons/react", () => ({
  PaperPlaneRight: () => <svg data-testid="send-icon" />,
}));

import { ConversationComposer } from "./conversation-composer";

describe("ConversationComposer", () => {
  it("submits the trimmed subject and message", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ConversationComposer isSubmitting={false} onSubmit={onSubmit} />);

    await user.type(
      screen.getByLabelText("Subject (optional)"),
      " Billing issue "
    );
    await user.type(screen.getByLabelText("Message"), "I need help");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: undefined,
      message: "I need help",
      subject: "Billing issue",
    });
  });

  it("explains an empty message instead of submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ConversationComposer isSubmitting={false} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText("Describe what you need help with.")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toHaveFocus();
  });

  it("submits with Cmd+Enter from the message field", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ConversationComposer isSubmitting={false} onSubmit={onSubmit} />);

    await user.type(
      screen.getByLabelText("Message"),
      "Hi{Meta>}{Enter}{/Meta}"
    );

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("blocks sending and shows progress while submitting", () => {
    render(<ConversationComposer isSubmitting={true} onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("requires a valid email from guests", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <ConversationComposer
        guestEmail="not-an-email"
        isGuest
        isSubmitting={false}
        onGuestEmailChange={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    await user.type(screen.getByLabelText("Message"), "I need help");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText("Enter your email so the team can reply.")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveFocus();
  });

  it("submits the guest email", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <ConversationComposer
        guestEmail="test@example.com"
        isGuest
        isSubmitting={false}
        onGuestEmailChange={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    await user.type(screen.getByLabelText("Message"), "I need help");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: "test@example.com",
      message: "I need help",
      subject: "",
    });
  });

  it("announces a server error", () => {
    render(
      <ConversationComposer
        error="Your message could not be sent."
        isSubmitting={false}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your message could not be sent."
    );
  });
});
