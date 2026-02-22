import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@hookform/resolvers/zod", () => ({
  zodResolver: () => async (values: Record<string, unknown>) => ({
    values,
    errors: {},
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
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

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    type,
    onClick,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    type?: string;
    onClick?: () => void;
  }) => (
    <button
      disabled={disabled}
      onClick={onClick}
      type={type as "button" | "submit"}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

vi.mock("@/components/ui/field", () => ({
  Field: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FieldLabel: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
  FieldError: () => null,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@phosphor-icons/react", () => ({
  Check: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
  Envelope: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
  Trash: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
  User: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
}));

import { ProfileSection } from "./profile-section";

afterEach(cleanup);

const user = { name: "John Doe", email: "john@test.com", image: null };

describe("ProfileSection", () => {
  it("renders card title", () => {
    render(
      <ProfileSection isLoading={false} setIsLoading={vi.fn()} user={user} />
    );
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("renders card description", () => {
    render(
      <ProfileSection isLoading={false} setIsLoading={vi.fn()} user={user} />
    );
    expect(
      screen.getByText("Update your profile information")
    ).toBeInTheDocument();
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

  it("shows User fallback when name is missing", () => {
    render(
      <ProfileSection
        isLoading={false}
        setIsLoading={vi.fn()}
        user={undefined}
      />
    );
    expect(screen.getByText("User")).toBeInTheDocument();
  });

  it("renders Save Changes button", () => {
    render(
      <ProfileSection isLoading={false} setIsLoading={vi.fn()} user={user} />
    );
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
  });

  it("disables Save Changes when isLoading", () => {
    render(
      <ProfileSection isLoading={true} setIsLoading={vi.fn()} user={user} />
    );
    expect(screen.getByText("Save Changes")).toBeDisabled();
  });

  it("renders avatar preview when user has image", () => {
    const userWithImage = {
      name: "John",
      email: "john@test.com",
      image: "https://example.com/avatar.jpg",
    };
    render(
      <ProfileSection
        isLoading={false}
        setIsLoading={vi.fn()}
        user={userWithImage}
      />
    );
    expect(screen.getByAltText("Avatar preview")).toBeInTheDocument();
    expect(screen.getByText("Avatar Preview")).toBeInTheDocument();
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

  it("clears avatar URL when trash button is clicked", async () => {
    const u = userEvent.setup();
    render(
      <ProfileSection isLoading={false} setIsLoading={vi.fn()} user={user} />
    );
    const input = screen.getByPlaceholderText("https://example.com/avatar.jpg");
    await u.type(input, "https://example.com/new.jpg");
    expect(screen.getByAltText("Avatar preview")).toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    const trashButton = buttons.find(
      (btn) => btn.querySelector("svg") && btn.textContent === ""
    );
    expect(trashButton).toBeDefined();
    await u.click(trashButton!);
    expect(screen.queryByAltText("Avatar preview")).not.toBeInTheDocument();
  });

  it("renders avatar helper text", () => {
    render(
      <ProfileSection isLoading={false} setIsLoading={vi.fn()} user={user} />
    );
    expect(
      screen.getByText(/Provide a direct link to your avatar/)
    ).toBeInTheDocument();
  });

  it("submits form and calls authClient.updateUser", async () => {
    const { authClient } = await import("@/lib/auth-client");
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
    await u.click(screen.getByText("Save Changes"));
    expect(authClient.updateUser).toHaveBeenCalled();
  });

  it("shows error toast on profile update failure", async () => {
    const { authClient } = await import("@/lib/auth-client");
    const { toast } = await import("sonner");
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
    await u.click(screen.getByText("Save Changes"));
    expect(toast.error).toHaveBeenCalledWith("Update failed");
  });
});
