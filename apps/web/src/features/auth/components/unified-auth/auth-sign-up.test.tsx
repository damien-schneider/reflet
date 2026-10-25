/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  domAnimation: {},
  LazyMotion: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: {
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

vi.mock("./lib/auth-validation", () => ({
  titleVariants: {
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    initial: { opacity: 0 },
  },
}));

import { AuthHeader } from "./auth-sign-up";

describe("AuthHeader", () => {
  it("renders a neutral title before the email is recognized", () => {
    render(<AuthHeader mode={null} />);
    expect(
      screen.getByText("Sign in or create an account")
    ).toBeInTheDocument();
  });

  it("renders Welcome back when mode is signIn", () => {
    render(<AuthHeader mode="signIn" />);
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });

  it("renders Create your account when mode is signUp", () => {
    render(<AuthHeader mode="signUp" />);
    expect(screen.getByText("Create your account")).toBeInTheDocument();
  });
});
