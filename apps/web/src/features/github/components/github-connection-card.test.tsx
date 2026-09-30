import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@phosphor-icons/react", () => ({
  Check: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-check" />
  ),
  GithubLogo: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-github" />
  ),
  Warning: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-warning" />
  ),
}));

vi.mock("@ctrl-ui/react/ui/spinner", () => ({
  Spinner: () => <span data-testid="icon-spinner" />,
}));

vi.mock("@ctrl-ui/react/ui/alert-dialog", () => ({
  AlertDialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
  }) => (open ? <div role="alertdialog">{children}</div> : null),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <img alt={alt} data-testid="next-image" src={src} />
  ),
}));

vi.mock("@ctrl-ui/react/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}));

vi.mock("@ctrl-ui/react/ui/button", () => ({
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
  ButtonLink: ({
    children,
    onClick,
    render,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    render?: React.ReactElement<{ href?: string }>;
  }) => (
    <a href={render?.props.href} onClick={onClick}>
      {children}
    </a>
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
    title,
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
    title?: string;
  }) => (
    <span className={className} data-variant={variant} title={title}>
      {children}
    </span>
  ),
}));

import { GitHubConnectionSection } from "./github-connection-card";

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
      screen.getByText(/Only admins can connect GitHub/)
    ).toBeInTheDocument();
    expect(screen.queryByText("Connect GitHub")).toBeNull();
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

  it("disconnects only after the admin confirms", async () => {
    const onDisconnect = vi.fn();
    const user = userEvent.setup();
    render(
      <GitHubConnectionSection
        accountLogin="octocat"
        connectHref="/api/github/install?test=1"
        isAdmin
        isConnected
        isDisconnecting={false}
        onConnectClick={vi.fn()}
        onDisconnect={onDisconnect}
      />
    );
    await user.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(onDisconnect).not.toHaveBeenCalled();
    expect(screen.getByText("Disconnect GitHub?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Disconnect GitHub" }));
    expect(onDisconnect).toHaveBeenCalledOnce();
  });

  it("cancelling the confirmation keeps GitHub connected", async () => {
    const onDisconnect = vi.fn();
    const user = userEvent.setup();
    render(
      <GitHubConnectionSection
        accountLogin="octocat"
        isAdmin
        isConnected
        isDisconnecting={false}
        onDisconnect={onDisconnect}
      />
    );
    await user.click(screen.getByRole("button", { name: "Disconnect" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDisconnect).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("shows a disabled connect button until the install link is ready", () => {
    render(
      <GitHubConnectionSection
        isAdmin
        isConnected={false}
        isDisconnecting={false}
        onDisconnect={vi.fn()}
      />
    );
    expect(
      screen.getByRole("button", { name: "Connect GitHub" })
    ).toBeDisabled();
  });

  it("tells admins how to recover when the connecting teammate left", () => {
    render(
      <GitHubConnectionSection
        connectHref="/api/github/install?test=1"
        isAdmin
        isConnected={false}
        isDisconnecting={false}
        isOwnerLeft
        onDisconnect={vi.fn()}
      />
    );
    expect(screen.getByText("GitHub connection lost")).toBeInTheDocument();
    expect(screen.getByText("Reconnect GitHub").closest("a")).toHaveAttribute(
      "href",
      "/api/github/install?test=1"
    );
  });

  it("points non-admins to an admin when the connecting teammate left", () => {
    render(
      <GitHubConnectionSection
        isAdmin={false}
        isConnected={false}
        isDisconnecting={false}
        isOwnerLeft
        onDisconnect={vi.fn()}
      />
    );
    expect(
      screen.getByText(/Ask an admin to reconnect GitHub/)
    ).toBeInTheDocument();
    expect(screen.queryByText("Reconnect GitHub")).toBeNull();
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
