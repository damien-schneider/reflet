"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { toast } from "@ctrl-ui/react/ui/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  type UpdatePasswordForm,
  updatePasswordSchema,
} from "@/features/account/account-schemas";
import { PasswordInputField } from "@/features/account/password-input-field";
import { SettingsSection } from "@/features/project/components/settings-page";
import { authClient } from "@/lib/auth-client";

interface PasswordSectionProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

type VisibleField = "current" | "new" | "confirm";

export function PasswordSection({
  isLoading,
  setIsLoading,
}: PasswordSectionProps) {
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<UpdatePasswordForm>({
    defaultValues: {
      confirmPassword: "",
      currentPassword: "",
      newPassword: "",
    },
    mode: "onTouched",
    resolver: zodResolver(updatePasswordSchema),
  });

  const [visibleFields, setVisibleFields] = useState<
    Record<VisibleField, boolean>
  >({ confirm: false, current: false, new: false });

  const toggleVisibility = (field: VisibleField) =>
    setVisibleFields((prev) => ({ ...prev, [field]: !prev[field] }));

  const handleUpdatePassword = async (data: UpdatePasswordForm) => {
    setIsLoading(true);
    try {
      await authClient.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success("Password updated");
      resetPassword();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update password"
      );
    }
    setIsLoading(false);
  };

  return (
    <SettingsSection description="Use at least 8 characters." title="Password">
      <form
        className="flex max-w-md flex-col gap-4"
        noValidate
        onSubmit={handleSubmitPassword(handleUpdatePassword)}
      >
        <PasswordInputField
          autoComplete="current-password"
          error={passwordErrors.currentPassword}
          id="currentPassword"
          label="Current password"
          onTogglePassword={() => toggleVisibility("current")}
          register={registerPassword("currentPassword")}
          showPassword={visibleFields.current}
        />
        <PasswordInputField
          autoComplete="new-password"
          error={passwordErrors.newPassword}
          id="newPassword"
          label="New password"
          onTogglePassword={() => toggleVisibility("new")}
          register={registerPassword("newPassword")}
          showPassword={visibleFields.new}
        />
        <PasswordInputField
          autoComplete="new-password"
          error={passwordErrors.confirmPassword}
          id="confirmPassword"
          label="Confirm new password"
          onTogglePassword={() => toggleVisibility("confirm")}
          register={registerPassword("confirmPassword")}
          showPassword={visibleFields.confirm}
        />
        <div>
          <Button
            disabled={isLoading}
            tone="primary"
            type="submit"
            variant="solid"
          >
            {isLoading ? "Updating…" : "Update password"}
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}
