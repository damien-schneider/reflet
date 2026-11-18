import { render, screen } from "@testing-library/react";
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

import { AuthSocialProviders } from "./auth-social-providers";

afterEach(() => {
  vi.clearAllMocks();
});

describe("AuthSocialProviders", () => {
  it("calls signIn.social with google provider on Google click", async () => {
    const user = userEvent.setup();
    render(<AuthSocialProviders />);
    await user.click(screen.getByText("Continue with Google"));
    expect(mockSignInSocial).toHaveBeenCalledWith({
      callbackURL: "/dashboard",
      provider: "google",
    });
  });

  it("calls signIn.social with github provider on GitHub click", async () => {
    const user = userEvent.setup();
    render(<AuthSocialProviders />);
    await user.click(screen.getByText("Continue with GitHub"));
    expect(mockSignInSocial).toHaveBeenCalledWith({
      callbackURL: "/dashboard",
      provider: "github",
    });
  });

  it("disables both providers while redirecting so the flow can't start twice", async () => {
    const user = userEvent.setup();
    render(<AuthSocialProviders />);
    await user.click(screen.getByText("Continue with Google"));
    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
    }
  });
});

it("returns to devtools consent after social sign-in", async () => {
  const user = userEvent.setup();
  const redirectTo = "/auth/devtools?state=pending-connect";
  render(<AuthSocialProviders redirectTo={redirectTo} />);
  await user.click(
    screen.getByRole("button", { name: "Continue with Google" })
  );
  expect(mockSignInSocial).toHaveBeenCalledWith({
    callbackURL: redirectTo,
    provider: "google",
  });
});
