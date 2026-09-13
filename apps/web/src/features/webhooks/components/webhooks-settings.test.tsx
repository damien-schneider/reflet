import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WebhooksSettings } from "./webhooks-settings";

const mockUseQuery = vi.fn();
const mockCreate = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: (name: unknown) =>
    String(name) === "webhooks.create" ? mockCreate : vi.fn(),
  useQuery: (name: unknown) => mockUseQuery(name),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    webhooks: {
      mutations: {
        create: "webhooks.create",
        remove: "webhooks.remove",
        update: "webhooks.update",
      },
      queries: {
        list: "webhooks.list",
        listDeliveries: "webhooks.listDeliveries",
      },
    },
  },
}));

vi.mock("@ctrl-ui/react/ui/toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@ctrl-ui/react/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    ...rest
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    "aria-label"?: string;
  }) => (
    <input
      aria-label={rest["aria-label"]}
      checked={checked}
      onChange={(event) => onCheckedChange(event.target.checked)}
      type="checkbox"
    />
  ),
}));

vi.mock("@ctrl-ui/react/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AlertDialogClose: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  AlertDialogContent: () => null,
  AlertDialogDescription: () => null,
  AlertDialogFooter: () => null,
  AlertDialogHeader: () => null,
  AlertDialogTitle: () => null,
}));

const organizationId = "org_1" as never;

describe("WebhooksSettings", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows the signing secret once after creating a webhook", async () => {
    mockUseQuery.mockReturnValue([]);
    mockCreate.mockResolvedValue({ secret: "whsec_once", webhookId: "wh_1" });

    render(<WebhooksSettings organizationId={organizationId} />);

    fireEvent.change(screen.getByLabelText("Webhook URL"), {
      target: { value: "https://example.com/hook" },
    });
    fireEvent.click(screen.getByLabelText("feedback.status_changed"));
    fireEvent.click(screen.getByRole("button", { name: "Add webhook" }));

    await waitFor(() => {
      expect(screen.getByText("whsec_once")).toBeInTheDocument();
    });
    expect(mockCreate).toHaveBeenCalledWith({
      description: undefined,
      events: ["feedback.created", "feedback.github_issue_created"],
      organizationId,
      url: "https://example.com/hook",
    });

    fireEvent.click(screen.getByRole("button", { name: "I've saved it" }));
    expect(screen.queryByText("whsec_once")).toBeNull();
  });

  it("disables submit until a URL and at least one event are set", () => {
    mockUseQuery.mockReturnValue([]);

    render(<WebhooksSettings organizationId={organizationId} />);

    const submit = screen.getByRole("button", { name: "Add webhook" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Webhook URL"), {
      target: { value: "https://example.com/hook" },
    });
    expect(submit).toBeEnabled();

    for (const event of [
      "feedback.created",
      "feedback.status_changed",
      "feedback.github_issue_created",
    ]) {
      fireEvent.click(screen.getByLabelText(event));
    }
    expect(submit).toBeDisabled();
  });
});
