import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@phosphor-icons/react", () => ({
  Brain: () => <span data-testid="icon-brain" />,
  Code: () => <span data-testid="icon-code" />,
  GithubLogo: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-github" />
  ),
  LightbulbFilament: () => <span data-testid="icon-lightbulb" />,
  TreeStructure: () => <span data-testid="icon-tree" />,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    render,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    render?: React.ReactElement;
  }) =>
    render ? (
      <a href={(render.props as { href?: string }).href} onClick={onClick}>
        {children}
      </a>
    ) : (
      <button onClick={onClick} type="button">
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
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
}));

import { GitHubConnectionPrompt } from "./github-connection-prompt";

afterEach(cleanup);

describe("GitHubConnectionPrompt", () => {
  it("renders title", () => {
    render(
      <GitHubConnectionPrompt
        connectHref="/api/github/install?test=1"
        isAdmin
        onConnectClick={vi.fn()}
      />
    );
    expect(
      screen.getByText("Connect GitHub to Enhance AI")
    ).toBeInTheDocument();
  });

  it("renders all benefits", () => {
    render(
      <GitHubConnectionPrompt
        connectHref="/api/github/install?test=1"
        isAdmin
        onConnectClick={vi.fn()}
      />
    );
    expect(
      screen.getByText("AI-Powered Repository Analysis")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Smarter Feedback Understanding")
    ).toBeInTheDocument();
    expect(screen.getByText("Better Coding Prompts")).toBeInTheDocument();
    expect(
      screen.getByText("Repository Structure Insights")
    ).toBeInTheDocument();
  });

  it("shows Connect button for admin", () => {
    render(
      <GitHubConnectionPrompt
        connectHref="/api/github/install?test=1"
        isAdmin
        onConnectClick={vi.fn()}
      />
    );
    expect(screen.getByText("Connect GitHub")).toBeInTheDocument();
  });

  it("shows non-admin message", () => {
    render(
      <GitHubConnectionPrompt
        connectHref="/api/github/install?test=1"
        isAdmin={false}
        onConnectClick={vi.fn()}
      />
    );
    expect(
      screen.getByText("Contact an admin to connect GitHub.")
    ).toBeInTheDocument();
  });

  it("renders connect link with correct href", () => {
    render(
      <GitHubConnectionPrompt
        connectHref="/api/github/install?test=1"
        isAdmin
        onConnectClick={vi.fn()}
      />
    );
    const link = screen.getByText("Connect GitHub").closest("a");
    expect(link).toHaveAttribute("href", "/api/github/install?test=1");
  });
});
