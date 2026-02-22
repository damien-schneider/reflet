import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
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
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button onClick={onClick} type="button">
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
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
    render(<GitHubConnectionPrompt isAdmin onConnect={vi.fn()} />);
    expect(
      screen.getByText("Connect GitHub to Enhance AI")
    ).toBeInTheDocument();
  });

  it("renders all benefits", () => {
    render(<GitHubConnectionPrompt isAdmin onConnect={vi.fn()} />);
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
    render(<GitHubConnectionPrompt isAdmin onConnect={vi.fn()} />);
    expect(screen.getByText("Connect GitHub")).toBeInTheDocument();
  });

  it("shows non-admin message", () => {
    render(<GitHubConnectionPrompt isAdmin={false} onConnect={vi.fn()} />);
    expect(
      screen.getByText("Contact an admin to connect GitHub.")
    ).toBeInTheDocument();
  });

  it("calls onConnect when button clicked", async () => {
    const onConnect = vi.fn();
    const user = userEvent.setup();
    render(<GitHubConnectionPrompt isAdmin onConnect={onConnect} />);
    await user.click(screen.getByText("Connect GitHub"));
    expect(onConnect).toHaveBeenCalled();
  });
});
