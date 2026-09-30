import { render, screen } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
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
    changePassword: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@ctrl-ui/react/ui/button", () => ({
  Button: ({
    children,
    disabled,
    type,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    type?: "button" | "submit";
  }) => (
    <button disabled={disabled} type={type}>
      {children}
    </button>
  ),
}));

vi.mock("@/features/account/password-input-field", () => ({
  PasswordInputField: ({
    id,
    label,
    showPassword,
    onTogglePassword,
    register,
  }: {
    id: string;
    label: string;
    showPassword?: boolean;
    onTogglePassword?: () => void;
    register: {
      name: string;
      onChange: (event: unknown) => void;
      onBlur: (event: unknown) => void;
      ref: (instance: HTMLInputElement | null) => void;
    };
  }) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} type={showPassword ? "text" : "password"} {...register} />
      <button
        data-testid={`toggle-${id}`}
        onClick={onTogglePassword}
        type="button"
      >
        toggle
      </button>
    </div>
  ),
}));

import { toast } from "@ctrl-ui/react/ui/toast";
import { authClient } from "@/lib/auth-client";
import { PasswordSection } from "./password-section";

const fillForm = async (user: UserEvent) => {
  await user.type(screen.getByLabelText("Current password"), "oldpassword1");
  await user.type(screen.getByLabelText("New password"), "newpassword1");
  await user.type(
    screen.getByLabelText("Confirm new password"),
    "newpassword1"
  );
  await user.click(screen.getByRole("button", { name: "Update password" }));
};

describe("PasswordSection", () => {
  it("disables submit and shows progress while a change is in flight", () => {
    render(<PasswordSection isLoading={true} setIsLoading={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Updating…" })).toBeDisabled();
  });

  it("submits the current and new password", async () => {
    const user = userEvent.setup();
    render(<PasswordSection isLoading={false} setIsLoading={vi.fn()} />);
    await fillForm(user);
    expect(authClient.changePassword).toHaveBeenCalledWith({
      currentPassword: "oldpassword1",
      newPassword: "newpassword1",
    });
  });

  it("shows the server error when the change fails", async () => {
    vi.mocked(authClient.changePassword).mockRejectedValueOnce(
      new Error("Wrong password")
    );
    const user = userEvent.setup();
    render(<PasswordSection isLoading={false} setIsLoading={vi.fn()} />);
    await fillForm(user);
    expect(toast.error).toHaveBeenCalledWith("Wrong password");
  });

  it("falls back to a generic error for non-Error rejections", async () => {
    vi.mocked(authClient.changePassword).mockRejectedValueOnce("string error");
    const user = userEvent.setup();
    render(<PasswordSection isLoading={false} setIsLoading={vi.fn()} />);
    await fillForm(user);
    expect(toast.error).toHaveBeenCalledWith("Failed to update password");
  });

  it("confirms a successful change", async () => {
    const user = userEvent.setup();
    render(<PasswordSection isLoading={false} setIsLoading={vi.fn()} />);
    await fillForm(user);
    expect(toast.success).toHaveBeenCalled();
  });

  it("toggles loading around the request", async () => {
    const setIsLoading = vi.fn();
    const user = userEvent.setup();
    render(<PasswordSection isLoading={false} setIsLoading={setIsLoading} />);
    await fillForm(user);
    expect(setIsLoading).toHaveBeenNthCalledWith(1, true);
    expect(setIsLoading).toHaveBeenLastCalledWith(false);
  });

  it("reveals each password field independently", async () => {
    const user = userEvent.setup();
    render(<PasswordSection isLoading={false} setIsLoading={vi.fn()} />);
    await user.click(screen.getByTestId("toggle-newPassword"));
    expect(screen.getByLabelText("New password")).toHaveAttribute(
      "type",
      "text"
    );
    expect(screen.getByLabelText("Current password")).toHaveAttribute(
      "type",
      "password"
    );
    expect(screen.getByLabelText("Confirm new password")).toHaveAttribute(
      "type",
      "password"
    );
  });
});
