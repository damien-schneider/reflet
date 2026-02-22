import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockSignInSocial = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      social: (...args: unknown[]) => mockSignInSocial(...args),
    },
  },
}));

vi.mock("@phosphor-icons/react", () => ({
  GithubLogo: ({
    className,
    weight,
  }: {
    className?: string;
    weight?: string;
  }) => (
    <svg className={className} data-testid="github-logo" data-weight={weight} />
  ),
  GoogleLogo: ({
    className,
    weight,
  }: {
    className?: string;
    weight?: string;
  }) => (
    <svg className={className} data-testid="google-logo" data-weight={weight} />
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    className,
    variant,
    type,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    variant?: string;
    type?: string;
  }) => (
    <button
      className={className}
      data-variant={variant}
      onClick={onClick}
      type={type as "button" | "submit"}
    >
      {children}
    </button>
  ),
}));

import { AuthDivider, AuthSocialProviders } from "./auth-social-providers";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AuthSocialProviders", () => {
  it("renders Google sign in button", () => {
    render(<AuthSocialProviders />);
    expect(screen.getByText("Continue with Google")).toBeInTheDocument();
  });

  it("renders GitHub sign in button", () => {
    render(<AuthSocialProviders />);
    expect(screen.getByText("Continue with GitHub")).toBeInTheDocument();
  });

  it("renders Google logo icon", () => {
    render(<AuthSocialProviders />);
    expect(screen.getByTestId("google-logo")).toBeInTheDocument();
  });

  it("renders GitHub logo icon", () => {
    render(<AuthSocialProviders />);
    expect(screen.getByTestId("github-logo")).toBeInTheDocument();
  });

  it("calls signIn.social with google provider on Google click", async () => {
    const user = userEvent.setup();
    render(<AuthSocialProviders />);
    await user.click(screen.getByText("Continue with Google"));
    expect(mockSignInSocial).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "/dashboard",
    });
  });

  it("calls signIn.social with github provider on GitHub click", async () => {
    const user = userEvent.setup();
    render(<AuthSocialProviders />);
    await user.click(screen.getByText("Continue with GitHub"));
    expect(mockSignInSocial).toHaveBeenCalledWith({
      provider: "github",
      callbackURL: "/dashboard",
    });
  });

  it("renders buttons with outline variant", () => {
    render(<AuthSocialProviders />);
    const buttons = screen.getAllByRole("button");
    for (const button of buttons) {
      expect(button).toHaveAttribute("data-variant", "outline");
    }
  });

  it("renders buttons with type button", () => {
    render(<AuthSocialProviders />);
    const buttons = screen.getAllByRole("button");
    for (const button of buttons) {
      expect(button).toHaveAttribute("type", "button");
    }
  });
});

describe("AuthDivider", () => {
  it("renders divider text", () => {
    render(<AuthDivider />);
    expect(screen.getByText("Or continue with email")).toBeInTheDocument();
  });

  it("renders border separator line", () => {
    const { container } = render(<AuthDivider />);
    const borderLine = container.querySelector(".border-t");
    expect(borderLine).toBeInTheDocument();
  });

  it("has correct styling classes", () => {
    const { container } = render(<AuthDivider />);
    expect(container.firstChild).toHaveClass("relative");
  });
});
