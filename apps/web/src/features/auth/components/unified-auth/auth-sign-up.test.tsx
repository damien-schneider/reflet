/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
      [key: string]: unknown;
    }) => <div className={className}>{children}</div>,
  },
}));

vi.mock("@/components/ui/typography", () => ({
  H1: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
    variant?: string;
  }) => <h1 className={className}>{children}</h1>,
  Muted: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
}));

vi.mock("./lib/auth-validation", () => ({
  titleVariants: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
}));

import { AuthHeader } from "./auth-sign-up";

afterEach(cleanup);

describe("AuthHeader", () => {
  it("renders Authentication title when mode is null", () => {
    render(<AuthHeader mode={null} />);
    expect(screen.getByText("Authentication")).toBeInTheDocument();
  });

  it("renders Welcome back when mode is signIn", () => {
    render(<AuthHeader mode="signIn" />);
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });

  it("renders Create an account when mode is signUp", () => {
    render(<AuthHeader mode="signUp" />);
    expect(screen.getByText("Create an account")).toBeInTheDocument();
  });

  it("renders description for null mode", () => {
    render(<AuthHeader mode={null} />);
    expect(
      screen.getByText("Enter your email to continue")
    ).toBeInTheDocument();
  });

  it("renders description for signIn mode", () => {
    render(<AuthHeader mode="signIn" />);
    expect(
      screen.getByText("Sign in with your email and password")
    ).toBeInTheDocument();
  });

  it("renders description for signUp mode", () => {
    render(<AuthHeader mode="signUp" />);
    expect(
      screen.getByText("Complete the information to create your account")
    ).toBeInTheDocument();
  });
});
