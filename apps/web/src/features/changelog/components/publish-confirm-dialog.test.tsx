import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    organizations: { get: "organizations:get" },
    github: { getConnectionStatus: "github:getConnectionStatus" },
    changelog_subscriptions: {
      getSubscriberCount: "changelog_subscriptions:getSubscriberCount",
    },
  },
}));

vi.mock("@phosphor-icons/react", () => ({
  GithubLogo: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="github-icon" />
  ),
  PaperPlaneTilt: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="paper-plane-icon" />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a className={className} data-testid="next-link" href={href}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    variant,
    className,
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
  }) => (
    <span className={className} data-variant={variant}>
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    size,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => (
    <button
      data-size={size}
      data-variant={variant}
      disabled={disabled}
      onClick={onClick}
      type="button"
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (val: boolean) => void;
  }) =>
    open ? (
      <div data-testid="dialog" onClick={() => onOpenChange(false)}>
        {children}
      </div>
    ) : null,
  DialogContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={className} data-testid="dialog-content">
      {children}
    </div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
}));

import { PublishConfirmDialog } from "./publish-confirm-dialog";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const ORG_ID = "org123" as Id<"organizations">;

describe("PublishConfirmDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    isSubmitting: false,
    title: "Big Update",
    version: "2.0.0",
    organizationId: ORG_ID,
    orgSlug: "test-org",
  };

  beforeEach(() => {
    mockUseQuery.mockImplementation((queryName: string) => {
      if (queryName === "organizations:get") {
        return { changelogSettings: {} };
      }
      if (queryName === "github:getConnectionStatus") {
        return { isConnected: false, hasRepository: false };
      }
      if (queryName === "changelog_subscriptions:getSubscriberCount") {
        return 0;
      }
      return undefined;
    });
  });

  it("renders when open is true", () => {
    render(<PublishConfirmDialog {...defaultProps} />);
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    render(<PublishConfirmDialog {...defaultProps} open={false} />);
    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
  });

  it("displays the dialog title", () => {
    render(<PublishConfirmDialog {...defaultProps} />);
    expect(screen.getByTestId("dialog-title")).toHaveTextContent(
      "Publish Release"
    );
  });

  it("displays release title", () => {
    render(<PublishConfirmDialog {...defaultProps} />);
    expect(screen.getByText("Big Update")).toBeInTheDocument();
  });

  it("displays version badge", () => {
    render(<PublishConfirmDialog {...defaultProps} />);
    expect(screen.getByText("2.0.0")).toBeInTheDocument();
  });

  it("shows Untitled Release when title is empty", () => {
    render(<PublishConfirmDialog {...defaultProps} title="" />);
    expect(screen.getByText("Untitled Release")).toBeInTheDocument();
  });

  it("does not show version badge when version is empty", () => {
    render(<PublishConfirmDialog {...defaultProps} version="" />);
    expect(screen.queryByText("2.0.0")).not.toBeInTheDocument();
  });

  it("shows zero subscribers message", () => {
    render(<PublishConfirmDialog {...defaultProps} />);
    expect(screen.getByText("No subscribers to notify")).toBeInTheDocument();
  });

  it("shows subscriber count when there are subscribers", () => {
    mockUseQuery.mockImplementation((queryName: string) => {
      if (queryName === "changelog_subscriptions:getSubscriberCount") {
        return 5;
      }
      if (queryName === "organizations:get") {
        return { changelogSettings: {} };
      }
      if (queryName === "github:getConnectionStatus") {
        return { isConnected: false };
      }
      return undefined;
    });
    render(<PublishConfirmDialog {...defaultProps} />);
    expect(
      screen.getByText("Notify 5 subscribers via email")
    ).toBeInTheDocument();
  });

  it("shows singular subscriber text for 1 subscriber", () => {
    mockUseQuery.mockImplementation((queryName: string) => {
      if (queryName === "changelog_subscriptions:getSubscriberCount") {
        return 1;
      }
      if (queryName === "organizations:get") {
        return { changelogSettings: {} };
      }
      if (queryName === "github:getConnectionStatus") {
        return { isConnected: false };
      }
      return undefined;
    });
    render(<PublishConfirmDialog {...defaultProps} />);
    expect(
      screen.getByText("Notify 1 subscriber via email")
    ).toBeInTheDocument();
  });

  it("shows GitHub integration when push is enabled and connected", () => {
    mockUseQuery.mockImplementation((queryName: string) => {
      if (queryName === "organizations:get") {
        return {
          changelogSettings: { pushToGithubOnPublish: true },
        };
      }
      if (queryName === "github:getConnectionStatus") {
        return {
          isConnected: true,
          hasRepository: true,
          repositoryFullName: "org/repo",
        };
      }
      if (queryName === "changelog_subscriptions:getSubscriberCount") {
        return 0;
      }
      return undefined;
    });
    render(<PublishConfirmDialog {...defaultProps} />);
    expect(
      screen.getByText(/Create GitHub Release on org\/repo/)
    ).toBeInTheDocument();
  });

  it("shows warning when GitHub push enabled but not connected", () => {
    mockUseQuery.mockImplementation((queryName: string) => {
      if (queryName === "organizations:get") {
        return {
          changelogSettings: { pushToGithubOnPublish: true },
        };
      }
      if (queryName === "github:getConnectionStatus") {
        return { isConnected: false, hasRepository: false };
      }
      if (queryName === "changelog_subscriptions:getSubscriberCount") {
        return 0;
      }
      return undefined;
    });
    render(<PublishConfirmDialog {...defaultProps} />);
    expect(
      screen.getByText(/GitHub push enabled but no repo connected/)
    ).toBeInTheDocument();
    expect(screen.getByText("Connect repository")).toBeInTheDocument();
  });

  it("renders connect repository link with correct href", () => {
    mockUseQuery.mockImplementation((queryName: string) => {
      if (queryName === "organizations:get") {
        return {
          changelogSettings: { pushToGithubOnPublish: true },
        };
      }
      if (queryName === "github:getConnectionStatus") {
        return { isConnected: false, hasRepository: false };
      }
      if (queryName === "changelog_subscriptions:getSubscriberCount") {
        return 0;
      }
      return undefined;
    });
    render(<PublishConfirmDialog {...defaultProps} />);
    const link = screen.getByText("Connect repository");
    expect(link.closest("a")).toHaveAttribute(
      "href",
      "/dashboard/test-org/settings/github"
    );
  });

  it("calls onConfirm when Publish button is clicked", () => {
    const onConfirm = vi.fn();
    render(<PublishConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText("Publish"));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("calls onOpenChange(false) when Cancel button is clicked", () => {
    const onOpenChange = vi.fn();
    render(
      <PublishConfirmDialog {...defaultProps} onOpenChange={onOpenChange} />
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables Publish button when isSubmitting", () => {
    render(<PublishConfirmDialog {...defaultProps} isSubmitting />);
    expect(screen.getByText("Publish")).toBeDisabled();
  });

  it("does not disable Publish button when not submitting", () => {
    render(<PublishConfirmDialog {...defaultProps} />);
    expect(screen.getByText("Publish")).not.toBeDisabled();
  });
});
