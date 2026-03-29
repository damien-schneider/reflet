import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@phosphor-icons/react", () => ({
  Check: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-check" />
  ),
  GithubLogo: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-github" />
  ),
  Spinner: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-spinner" />
  ),
  X: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-x" />
  ),
}));

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <img alt={alt} data-testid="next-image" src={src} />
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    render,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    render?: React.ReactElement;
  }) =>
    render ? (
      <a href={(render.props as { href?: string }).href} onClick={onClick}>
        {children}
      </a>
    ) : (
      <button disabled={disabled} onClick={onClick} type="button">
        {children}
      </button>
    ),
}));

vi.mock("@/components/ui/typography", () => ({
  H3: ({
    children,
    variant,
    className,
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
  }) => (
    <h3 className={className} data-variant={variant}>
      {children}
    </h3>
  ),
  Muted: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <p className={className}>{children}</p>,
  Text: ({
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

import { GitHubConnectionSection } from "./github-connection-card";

afterEach(cleanup);

describe("GitHubConnectionSection", () => {
  it("renders connect button when not connected and admin", () => {
    render(
      <GitHubConnectionSection
        connectHref="/api/github/install?test=1"
        isAdmin
        isConnected={false}
        isDisconnecting={false}
        onConnectClick={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );
    expect(screen.getByText("Connect GitHub")).toBeInTheDocument();
  });

  it("shows non-admin message when not connected and not admin", () => {
    render(
      <GitHubConnectionSection
        connectHref="/api/github/install?test=1"
        isAdmin={false}
        isConnected={false}
        isDisconnecting={false}
        onConnectClick={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );
    expect(
      screen.getByText("Contact an admin to connect GitHub.")
    ).toBeInTheDocument();
  });

  it("renders connected state with account login", () => {
    render(
      <GitHubConnectionSection
        accountAvatarUrl="https://example.com/avatar.png"
        accountLogin="octocat"
        connectHref="/api/github/install?test=1"
        isAdmin
        isConnected
        isDisconnecting={false}
        onConnectClick={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );
    expect(screen.getByText("octocat")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("renders avatar image when connected", () => {
    render(
      <GitHubConnectionSection
        accountAvatarUrl="https://example.com/avatar.png"
        accountLogin="octocat"
        connectHref="/api/github/install?test=1"
        isAdmin
        isConnected
        isDisconnecting={false}
        onConnectClick={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );
    expect(screen.getByTestId("next-image")).toBeInTheDocument();
  });

  it("renders connect link with correct href", () => {
    render(
      <GitHubConnectionSection
        connectHref="/api/github/install?test=1"
        isAdmin
        isConnected={false}
        isDisconnecting={false}
        onConnectClick={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );
    const link = screen.getByText("Connect GitHub").closest("a");
    expect(link).toHaveAttribute("href", "/api/github/install?test=1");
  });

  it("calls onDisconnect when disconnect button clicked", async () => {
    const onDisconnect = vi.fn();
    const user = userEvent.setup();
    render(
      <GitHubConnectionSection
        accountLogin="octocat"
        isAdmin
        isConnected
        isDisconnecting={false}
        onConnect={vi.fn()}
        onDisconnect={onDisconnect}
      />
    );
    await user.click(screen.getByText("Disconnect"));
    expect(onDisconnect).toHaveBeenCalled();
  });

  it("disables disconnect button when disconnecting", () => {
    render(
      <GitHubConnectionSection
        accountLogin="octocat"
        connectHref="/api/github/install?test=1"
        isAdmin
        isConnected
        isDisconnecting
        onConnectClick={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );
    expect(screen.getByText("Disconnect").closest("button")).toBeDisabled();
  });

  it("hides disconnect for non-admin when connected", () => {
    render(
      <GitHubConnectionSection
        accountLogin="octocat"
        connectHref="/api/github/install?test=1"
        isAdmin={false}
        isConnected
        isDisconnecting={false}
        onConnectClick={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );
    expect(screen.queryByText("Disconnect")).toBeNull();
  });
});
