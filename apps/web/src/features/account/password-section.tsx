"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "@phosphor-icons/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { H3, Text } from "@/components/ui/typography";
import {
  type UpdatePasswordForm,
  updatePasswordSchema,
} from "@/features/account/account-schemas";
import { PasswordInputField } from "@/features/account/password-input-field";
import { authClient } from "@/lib/auth-client";

interface PasswordSectionProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

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
    mode: "onChange",
    resolver: zodResolver(updatePasswordSchema),
  });

  const [showPassword, setShowPassword] = useState({
    confirm: false,
    current: false,
    new: false,
  });

  const handleUpdatePassword = async (data: UpdatePasswordForm) => {
    setIsLoading(true);
    try {
      await authClient.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success("Password updated successfully");
      resetPassword();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update password"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <H3 variant="section">Password</H3>

      <form
        className="space-y-4"
        onSubmit={handleSubmitPassword(handleUpdatePassword)}
      >
        <PasswordInputField
          error={passwordErrors.currentPassword}
          id="currentPassword"
          label="Current Password"
          onTogglePassword={() =>
            setShowPassword((prev) => ({
              ...prev,
              current: !prev.current,
            }))
          }
          placeholder="Enter your current password"
          register={registerPassword("currentPassword")}
          showPassword={showPassword.current}
        />

        <PasswordInputField
          error={passwordErrors.newPassword}
          id="newPassword"
          label="New Password"
          onTogglePassword={() =>
            setShowPassword((prev) => ({
              ...prev,
              new: !prev.new,
            }))
          }
          placeholder="Enter your new password"
          register={registerPassword("newPassword")}
          showPassword={showPassword.new}
        />
        <Text variant="caption">Password must be at least 8 characters</Text>

        <PasswordInputField
          error={passwordErrors.confirmPassword}
          id="confirmPassword"
          label="Confirm New Password"
          onTogglePassword={() =>
            setShowPassword((prev) => ({
              ...prev,
              confirm: !prev.confirm,
            }))
          }
          placeholder="Confirm your new password"
          register={registerPassword("confirmPassword")}
          showPassword={showPassword.confirm}
        />

        <Button className="w-full md:w-auto" disabled={isLoading} type="submit">
          <Check className="mr-2 size-4" />
          Update Password
        </Button>
      </form>
    </section>
  );
}
