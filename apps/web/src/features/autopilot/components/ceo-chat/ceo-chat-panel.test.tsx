import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { CeoChatPanel } from "@/features/autopilot/components/ceo-chat/ceo-chat-panel";
import { toOrgId } from "@/lib/convex-helpers";

const { mockSendMessage, mockToastError } = vi.hoisted(() => ({
  mockSendMessage: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("@convex-dev/agent/react", () => ({
  optimisticallySendMessage: vi.fn(),
  useUIMessages: () => ({ results: [], status: "Exhausted" }),
}));

vi.mock("convex/react", () => ({
  useMutation: (mutation: string) => {
    if (mutation === "autopilot.ceo_chat.getOrCreateThread") {
      return vi.fn(() => Promise.resolve("thread_123"));
    }
    if (mutation === "autopilot.ceo_chat.sendMessage") {
      return { withOptimisticUpdate: () => mockSendMessage };
    }
    throw new Error(`Unhandled mutation: ${mutation}`);
  },
  useQuery: () => null,
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    autopilot: {
      ceo_chat: {
        getOrCreateThread: "autopilot.ceo_chat.getOrCreateThread",
        getThread: "autopilot.ceo_chat.getThread",
        listMessages: "autopilot.ceo_chat.listMessages",
        sendMessage: "autopilot.ceo_chat.sendMessage",
      },
    },
  },
}));

vi.mock("jotai", () => ({
  useSetAtom: () => vi.fn(),
}));

vi.mock("@/store/ui", () => ({
  ceoChatOpenAtom: {},
}));

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
  },
}));

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe("CeoChatPanel", () => {
  it("shows clean copy instead of raw Convex errors", async () => {
    const user = userEvent.setup();
    mockSendMessage.mockRejectedValueOnce(
      new Error(
        "[CONVEX M(autopilot/ceo_chat:sendMessage)] Server Error Uncaught Error: Autopilot requires a Pro subscription."
      )
    );

    render(<CeoChatPanel organizationId={toOrgId("org_123")} />);

    await user.type(screen.getByPlaceholderText("Message CEO..."), "Plan");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        "CEO chat requires an active Autopilot Pro workspace."
      )
    );
    expect(mockToastError).not.toHaveBeenCalledWith(
      expect.stringContaining("[CONVEX")
    );
  });
});
