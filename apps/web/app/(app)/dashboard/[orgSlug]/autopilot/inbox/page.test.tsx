import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { InboxItem } from "@/features/autopilot/components/inbox/types";
import { toId, toOrgId } from "@/lib/convex-helpers";

const {
  mockRouterPush,
  mockToastError,
  mockToastSuccess,
  mockUseQuery,
  mutationHandlers,
} = vi.hoisted(() => ({
  mockRouterPush: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockUseQuery: vi.fn(),
  mutationHandlers: new Map<string, ReturnType<typeof vi.fn>>(),
}));

let approveWorkItem: ReturnType<typeof vi.fn>;
let rejectWorkItem: ReturnType<typeof vi.fn>;
let inboxItems: InboxItem[];

vi.mock("convex/react", () => ({
  useMutation: (mutation: string) => {
    const handler = mutationHandlers.get(mutation);
    if (!handler) {
      throw new Error(`Unhandled mutation: ${mutation}`);
    }
    return handler;
  },
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    autopilot: {
      mutations: {
        inbox: {
          approveDocument: "autopilot.inbox.approveDocument",
          approveWorkItem: "autopilot.inbox.approveWorkItem",
          rejectDocument: "autopilot.inbox.rejectDocument",
          rejectWorkItem: "autopilot.inbox.rejectWorkItem",
        },
        reports: {
          acknowledgeReport: "autopilot.reports.acknowledgeReport",
        },
      },
      queries: {
        documents: {
          getDocument: "autopilot.documents.getDocument",
        },
        inbox: {
          getInboxCounts: "autopilot.inbox.getInboxCounts",
          listInboxItems: "autopilot.inbox.listInboxItems",
        },
        reports: {
          getReport: "autopilot.reports.getReport",
        },
      },
    },
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}));

vi.mock("@/features/autopilot/components/autopilot-context", () => ({
  useAutopilotContext: () => ({
    isAdmin: true,
    organizationId: "org_123",
    orgSlug: "acme",
  }),
}));

vi.mock("@/features/autopilot/components/inbox/inbox-controls", () => ({
  InboxFilters: ({
    onSearchChange,
    searchQuery,
  }: {
    onSearchChange: (query: string) => void;
    searchQuery: string;
  }) => (
    <input
      aria-label="Search inbox"
      onChange={(event) => onSearchChange(event.target.value)}
      value={searchQuery}
    />
  ),
  InboxHeader: ({
    onBulkApprove,
    pendingCount,
  }: {
    onBulkApprove: () => void;
    pendingCount: number;
  }) =>
    pendingCount > 1 ? (
      <button onClick={onBulkApprove} type="button">
        Approve All ({pendingCount})
      </button>
    ) : null,
}));

vi.mock("@/features/autopilot/components/inbox/inbox-list", () => ({
  InboxList: ({
    filteredItems,
    onOpen,
    selectedIndex,
  }: {
    filteredItems: InboxItem[] | undefined;
    onOpen: (item: InboxItem) => void;
    selectedIndex: number;
  }) => (
    <div>
      {filteredItems?.map((item, index) => (
        <button
          aria-current={index === selectedIndex ? "true" : undefined}
          key={item._id}
          onClick={() => onOpen(item)}
          type="button"
        >
          {item.title}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@/features/autopilot/components/document-sheet", () => ({
  DocumentSheet: () => null,
}));

vi.mock("@/features/autopilot/components/report-sheet", () => ({
  ReportSheet: () => null,
}));

vi.mock("date-fns", () => ({
  formatDistanceToNow: () => "just now",
}));

interface WorkItemOptions {
  id: string;
  prUrl?: string;
  title: string;
}

function createWorkItem({ id, prUrl, title }: WorkItemOptions): InboxItem {
  return {
    _creationTime: 1,
    _id: toId("autopilotWorkItems", id),
    _source: "work",
    assignedAgent: "cto",
    createdAt: 1,
    description: `${title} description`,
    needsReview: true,
    organizationId: toOrgId("org_123"),
    priority: "medium",
    prUrl,
    reviewType: "task_approval",
    status: "in_review",
    title,
    type: "task",
    updatedAt: 1,
  };
}

async function renderInboxPage() {
  const { default: AutopilotInboxPage } = await import("./page");
  render(<AutopilotInboxPage />);
}

function registerMutations() {
  approveWorkItem = vi.fn(() => Promise.resolve(null));
  rejectWorkItem = vi.fn(() => Promise.resolve(null));
  mutationHandlers.set("autopilot.inbox.approveWorkItem", approveWorkItem);
  mutationHandlers.set("autopilot.inbox.rejectWorkItem", rejectWorkItem);
  mutationHandlers.set(
    "autopilot.inbox.approveDocument",
    vi.fn(() => Promise.resolve(null))
  );
  mutationHandlers.set(
    "autopilot.inbox.rejectDocument",
    vi.fn(() => Promise.resolve(null))
  );
  mutationHandlers.set(
    "autopilot.reports.acknowledgeReport",
    vi.fn(() => Promise.resolve(null))
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mutationHandlers.clear();
  registerMutations();
  inboxItems = [
    createWorkItem({ id: "work-visible-1", title: "Ship onboarding flow" }),
    createWorkItem({ id: "work-visible-2", title: "Ship billing flow" }),
    createWorkItem({ id: "work-hidden", title: "Draft roadmap" }),
  ];
  mockUseQuery.mockImplementation((queryName: unknown) => {
    if (queryName === "autopilot.inbox.listInboxItems") {
      return inboxItems;
    }
    if (queryName === "autopilot.inbox.getInboxCounts") {
      return {
        documentCount: 0,
        reportCount: 0,
        total: inboxItems.length,
        workItemCount: inboxItems.length,
      };
    }
    return null;
  });
});

afterEach(() => {
  cleanup();
});

describe("AutopilotInboxPage", () => {
  it("bulk approves only visible filtered pending items and shows their count", async () => {
    const user = userEvent.setup();
    await renderInboxPage();

    await user.type(screen.getByLabelText("Search inbox"), "ship");

    await user.click(screen.getByRole("button", { name: "Approve All (2)" }));

    await waitFor(() => expect(approveWorkItem).toHaveBeenCalledTimes(2));
    expect(approveWorkItem).toHaveBeenCalledWith({
      workItemId: toId("autopilotWorkItems", "work-visible-1"),
    });
    expect(approveWorkItem).toHaveBeenCalledWith({
      workItemId: toId("autopilotWorkItems", "work-visible-2"),
    });
    expect(approveWorkItem).not.toHaveBeenCalledWith({
      workItemId: toId("autopilotWorkItems", "work-hidden"),
    });
  });

  it("routes work items without a PR URL to the task detail page", async () => {
    const user = userEvent.setup();
    inboxItems = [
      createWorkItem({ id: "work-without-pr", title: "Open task detail" }),
    ];
    await renderInboxPage();

    await user.click(screen.getByText("Open task detail"));

    expect(mockRouterPush).toHaveBeenCalledWith(
      "/dashboard/acme/autopilot/tasks/work-without-pr"
    );
  });

  it("routes PR-backed work items to in-app task detail", async () => {
    const user = userEvent.setup();
    const openWindow = vi.spyOn(window, "open").mockImplementation(() => null);
    inboxItems = [
      createWorkItem({
        id: "work-with-pr",
        prUrl: "https://github.com/acme/reflet/pull/42",
        title: "Review PR task",
      }),
    ];
    await renderInboxPage();

    await user.click(screen.getByText("Review PR task"));

    expect(mockRouterPush).toHaveBeenCalledWith(
      "/dashboard/acme/autopilot/tasks/work-with-pr"
    );
    expect(openWindow).not.toHaveBeenCalled();
    openWindow.mockRestore();
  });

  it("does not approve or reject from plain unmodified global keys", async () => {
    inboxItems = [
      createWorkItem({ id: "shortcut-item", title: "Shortcut review" }),
    ];
    await renderInboxPage();

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "y" }));
    });

    expect(approveWorkItem).not.toHaveBeenCalled();
    expect(rejectWorkItem).not.toHaveBeenCalled();
  });

  it("does not approve with reserved select-all shortcuts", async () => {
    inboxItems = [
      createWorkItem({ id: "shortcut-item", title: "Shortcut review" }),
    ];
    await renderInboxPage();

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "a", metaKey: true })
      );
    });

    expect(approveWorkItem).not.toHaveBeenCalled();
  });

  it("does not reject from global modifier shortcuts", async () => {
    inboxItems = [
      createWorkItem({ id: "shortcut-item", title: "Shortcut review" }),
    ];
    await renderInboxPage();

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { ctrlKey: true, key: "y" })
      );
    });

    expect(rejectWorkItem).not.toHaveBeenCalled();
  });

  it("keeps unmodified j and Enter keyboard navigation", async () => {
    inboxItems = [
      createWorkItem({ id: "first-task", title: "First task" }),
      createWorkItem({ id: "second-task", title: "Second task" }),
    ];
    await renderInboxPage();

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "j" }));
    });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Second task" })
      ).toHaveAttribute("aria-current", "true")
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    });

    await waitFor(() =>
      expect(mockRouterPush).toHaveBeenCalledWith(
        "/dashboard/acme/autopilot/tasks/second-task"
      )
    );
  });
});
