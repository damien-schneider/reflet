import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@hookform/resolvers/zod", () => ({
  zodResolver: () => async (values: Record<string, unknown>) => ({
    errors: {},
    values,
  }),
}));

vi.mock("@ctrl-ui/react/ui/toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    updateUser: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
    className,
  }: {
    alt: string;
    src: string;
    className?: string;
  }) => <img alt={alt} className={className} src={src} />,
}));

vi.mock("@ctrl-ui/react/ui/button", () => ({
  Button: ({
    children,
    disabled,
    type,
    onClick,
    "aria-label": ariaLabel,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    type?: "button" | "submit";
    onClick?: () => void;
    "aria-label"?: string;
  }) => (
    <button
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  ),
}));

vi.mock("@ctrl-ui/react/ui/field", () => ({
  Field: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FieldDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  FieldError: () => null,
  FieldLabel: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock("@ctrl-ui/react/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock("@phosphor-icons/react", () => ({
  User: () => <svg />,
  X: () => <svg />,
}));

import { toast } from "@ctrl-ui/react/ui/toast";
import { authClient } from "@/lib/auth-client";
import { ProfileSection } from "./profile-section";

const user = { email: "john@test.com", image: null, name: "John Doe" };

describe("ProfileSection", () => {
  it("renders card title", () => {
    render(
      <ProfileSection isLoading={false} setIsLoading={vi.fn()} user={user} />
    );
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("renders Name field with default value", () => {
    render(
      <ProfileSection isLoading={false} setIsLoading={vi.fn()} user={user} />
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
  });

  it("renders Avatar URL field", () => {
    render(
      <ProfileSection isLoading={false} setIsLoading={vi.fn()} user={user} />
    );
    expect(screen.getByText("Avatar URL")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("https://example.com/avatar.jpg")
    ).toBeInTheDocument();
  });

  it("shows user name in info section", () => {
    render(
      <ProfileSection isLoading={false} setIsLoading={vi.fn()} user={user} />
    );
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("shows user email in info section", () => {
    render(
      <ProfileSection isLoading={false} setIsLoading={vi.fn()} user={user} />
    );
    expect(screen.getByText("john@test.com")).toBeInTheDocument();
  });

  it("shows a neutral fallback when the name is missing", () => {
    render(
      <ProfileSection
        isLoading={false}
        setIsLoading={vi.fn()}
        user={undefined}
      />
    );
    expect(screen.getByText("Your profile")).toBeInTheDocument();
  });

  it("keeps save disabled until the form changes", () => {
    render(
      <ProfileSection isLoading={false} setIsLoading={vi.fn()} user={user} />
    );
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("shows progress while saving", () => {
    render(
      <ProfileSection isLoading={true} setIsLoading={vi.fn()} user={user} />
    );
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });

  it("renders avatar preview when user has image", () => {
    const userWithImage = {
      email: "john@test.com",
      image: "https://example.com/avatar.jpg",
      name: "John",
    };
    render(
      <ProfileSection
        isLoading={false}
        setIsLoading={vi.fn()}
        user={userWithImage}
      />
    );
    expect(screen.getByAltText("Avatar preview")).toBeInTheDocument();
  });

  it("does not show avatar preview when no image", () => {
    render(
      <ProfileSection isLoading={false} setIsLoading={vi.fn()} user={user} />
    );
    expect(screen.queryByAltText("Avatar preview")).not.toBeInTheDocument();
  });

  it("allows typing in avatar URL input", async () => {
    const u = userEvent.setup();
    render(
      <ProfileSection isLoading={false} setIsLoading={vi.fn()} user={user} />
    );
    const input = screen.getByPlaceholderText("https://example.com/avatar.jpg");
    await u.type(input, "https://example.com/new.jpg");
    expect(input).toHaveValue("https://example.com/new.jpg");
  });

  it("shows avatar preview after entering URL", async () => {
    const u = userEvent.setup();
    render(
      <ProfileSection isLoading={false} setIsLoading={vi.fn()} user={user} />
    );
    const input = screen.getByPlaceholderText("https://example.com/avatar.jpg");
    await u.type(input, "https://example.com/new.jpg");
    expect(screen.getByAltText("Avatar preview")).toBeInTheDocument();
  });

  it("clears avatar URL when the clear button is clicked", async () => {
    const u = userEvent.setup();
    render(
      <ProfileSection isLoading={false} setIsLoading={vi.fn()} user={user} />
    );
    const input = screen.getByPlaceholderText("https://example.com/avatar.jpg");
    await u.type(input, "https://example.com/new.jpg");
    expect(screen.getByAltText("Avatar preview")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Clear avatar URL" }));
    expect(screen.queryByAltText("Avatar preview")).not.toBeInTheDocument();
  });

  it("submits form and calls authClient.updateUser", async () => {
    const u = userEvent.setup();
    const setIsLoading = vi.fn();
    render(
      <ProfileSection
        isLoading={false}
        setIsLoading={setIsLoading}
        user={user}
      />
    );
    const nameInput = screen.getByDisplayValue("John Doe");
    await u.clear(nameInput);
    await u.type(nameInput, "Jane Doe");
    await u.click(screen.getByRole("button", { name: "Save changes" }));
    expect(authClient.updateUser).toHaveBeenCalled();
  });

  it("shows error toast on profile update failure", async () => {
    vi.mocked(authClient.updateUser).mockRejectedValueOnce(
      new Error("Update failed")
    );
    const u = userEvent.setup();
    render(
      <ProfileSection isLoading={false} setIsLoading={vi.fn()} user={user} />
    );
    const nameInput = screen.getByDisplayValue("John Doe");
    await u.clear(nameInput);
    await u.type(nameInput, "New Name");
    await u.click(screen.getByRole("button", { name: "Save changes" }));
    expect(toast.error).toHaveBeenCalledWith("Update failed");
  });
});
