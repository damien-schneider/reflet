import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConversationStatusBadge } from "./conversation-status-badge";

describe("ConversationStatusBadge", () => {
  it("tells the customer support has replied when the team awaits their answer", () => {
    render(
      <ConversationStatusBadge status="awaiting_reply" viewer="customer" />
    );
    expect(screen.getByText("Replied")).toBeInTheDocument();
  });

  it("tells the team they are awaiting the customer after replying", () => {
    render(<ConversationStatusBadge status="awaiting_reply" viewer="team" />);
    expect(screen.getByText("Awaiting")).toBeInTheDocument();
  });

  it("falls back to the raw status for statuses it does not know", () => {
    render(<ConversationStatusBadge status="snoozed" viewer="customer" />);
    expect(screen.getByText("snoozed")).toBeInTheDocument();
  });
});
