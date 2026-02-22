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
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button disabled={disabled} onClick={onClick} type="button">
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
}));

vi.mock("@/components/ui/typography", () => ({
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

import { GitHubConnectionCard } from "./github-connection-card";

afterEach(cleanup);

describe("GitHubConnectionCard", () => {
  it("renders connect button when not connected and admin", () => {
    render(
      <GitHubConnectionCard
        isAdmin
        isConnected={false}
        isDisconnecting={false}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );
    expect(screen.getByText("Connect GitHub")).toBeInTheDocument();
  });

  it("shows non-admin message when not connected and not admin", () => {
    render(
      <GitHubConnectionCard
        isAdmin={false}
        isConnected={false}
        isDisconnecting={false}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );
    expect(
      screen.getByText("Contact an admin to connect GitHub.")
    ).toBeInTheDocument();
  });

  it("renders connected state with account login", () => {
    render(
      <GitHubConnectionCard
        accountAvatarUrl="https://example.com/avatar.png"
        accountLogin="octocat"
        isAdmin
        isConnected
        isDisconnecting={false}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );
    expect(screen.getByText("octocat")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("renders avatar image when connected", () => {
    render(
      <GitHubConnectionCard
        accountAvatarUrl="https://example.com/avatar.png"
        accountLogin="octocat"
        isAdmin
        isConnected
        isDisconnecting={false}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );
    expect(screen.getByTestId("next-image")).toBeInTheDocument();
  });

  it("calls onConnect when connect button clicked", async () => {
    const onConnect = vi.fn();
    const user = userEvent.setup();
    render(
      <GitHubConnectionCard
        isAdmin
        isConnected={false}
        isDisconnecting={false}
        onConnect={onConnect}
        onDisconnect={vi.fn()}
      />
    );
    await user.click(screen.getByText("Connect GitHub"));
    expect(onConnect).toHaveBeenCalled();
  });

  it("calls onDisconnect when disconnect button clicked", async () => {
    const onDisconnect = vi.fn();
    const user = userEvent.setup();
    render(
      <GitHubConnectionCard
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
      <GitHubConnectionCard
        accountLogin="octocat"
        isAdmin
        isConnected
        isDisconnecting
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );
    expect(screen.getByText("Disconnect").closest("button")).toBeDisabled();
  });

  it("hides disconnect for non-admin when connected", () => {
    render(
      <GitHubConnectionCard
        accountLogin="octocat"
        isAdmin={false}
        isConnected
        isDisconnecting={false}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );
    expect(screen.queryByText("Disconnect")).toBeNull();
  });
});
