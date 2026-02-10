"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "@phosphor-icons/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    resolver: zodResolver(updatePasswordSchema),
    mode: "onChange",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handleUpdatePassword = async (data: UpdatePasswordForm) => {
    setIsLoading(true);
    try {
      await authClient.changePassword({
        newPassword: data.newPassword,
        currentPassword: data.currentPassword,
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
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Change your password</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
          <p className="text-muted-foreground text-xs">
            Password must be at least 8 characters
          </p>

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

          <Button
            className="w-full md:w-auto"
            disabled={isLoading}
            type="submit"
          >
            <Check className="mr-2 size-4" />
            Update Password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
