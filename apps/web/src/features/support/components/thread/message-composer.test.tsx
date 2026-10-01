import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { MessageComposer } from "@/features/support/components/thread/message-composer";

const field = { label: "Reply", placeholder: "Write a reply…" };
const reportError = vi.fn();
vi.stubGlobal("reportError", reportError);

it("sends on Enter and clears the field", async () => {
  const onSend = vi.fn(() => Promise.resolve());
  render(<MessageComposer field={field} onSend={onSend} />);
  const reply = screen.getByRole("textbox", { name: "Reply" });

  await userEvent.type(reply, "Thanks for the report{Enter}");

  expect(onSend).toHaveBeenCalledWith("Thanks for the report");
  expect(reply).toHaveValue("");
});

it("keeps Shift+Enter as a newline instead of sending", async () => {
  const onSend = vi.fn(() => Promise.resolve());
  render(<MessageComposer field={field} onSend={onSend} />);
  const reply = screen.getByRole("textbox", { name: "Reply" });

  await userEvent.type(reply, "First line{Shift>}{Enter}{/Shift}Second");

  expect(onSend).not.toHaveBeenCalled();
  expect(reply).toHaveValue("First line\nSecond");
});

it("restores the draft and explains the failure when sending fails", async () => {
  const onSend = vi.fn(() => Promise.reject(new Error("offline")));
  render(<MessageComposer field={field} onSend={onSend} />);
  const reply = screen.getByRole("textbox", { name: "Reply" });

  await userEvent.type(reply, "Are you there?{Enter}");

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Message not sent"
  );
  expect(reply).toHaveValue("Are you there?");
  expect(reportError).not.toHaveBeenCalled();
});

it("blocks replies and says why when the conversation is closed", () => {
  render(
    <MessageComposer
      field={{ ...field, disabledReason: "Reopen this conversation to reply" }}
      onSend={vi.fn()}
    />
  );
  const reply = screen.getByRole("textbox", { name: "Reply" });

  expect(reply).toBeDisabled();
  expect(reply).toHaveAttribute(
    "placeholder",
    "Reopen this conversation to reply"
  );
});
