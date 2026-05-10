"use client";

import Link from "next/link";
import type { UseFormSetValue, UseFormTrigger } from "react-hook-form";
import { AuthEmailField, AuthPasswordField } from "./auth-fields";
import {
  AuthConfirmPassword,
  AuthForgotPasswordLink,
} from "./auth-forgot-password";
import { AuthHelperText, AuthSubmitButton } from "./auth-sign-in";
import { AuthHeader } from "./auth-sign-up";
import { AuthDivider, AuthSocialProviders } from "./auth-social-providers";
import { type AuthMode, useAuthForm } from "./hooks/use-auth-form";
import type { SignUpFormData } from "./lib/auth-validation";

interface UnifiedAuthFormProps {
  onSuccess?: () => void;
}

function isFormValid(
  mode: AuthMode,
  errors: Record<string, unknown>,
  watchedPassword: string,
  watchedConfirmPassword: string
): boolean {
  if (!mode || errors.email) {
    return false;
  }

  if (mode === "signUp") {
    // New accounts require 8+ character passwords
    return (
      watchedPassword.length >= 8 &&
      watchedConfirmPassword.length >= 8 &&
      watchedPassword === watchedConfirmPassword
    );
  }

  // For sign-in, allow any password length (existing users may have shorter passwords)
  // Server will validate the actual credentials
  return watchedPassword.length > 0;
}

function getConfirmPasswordErrors(
  passwordMismatchError: string | null,
  confirmPasswordError?: { message?: string }
): Array<{ message?: string }> | undefined {
  if (passwordMismatchError) {
    return [{ message: passwordMismatchError }];
  }
  if (confirmPasswordError) {
    return [confirmPasswordError];
  }
  return undefined;
}

export default function UnifiedAuthForm({ onSuccess }: UnifiedAuthFormProps) {
  const {
    mode,
    apiError,
    setApiError,
    passwordMismatchError,
    register,
    handleSubmit,
    errors,
    isSubmitting,
    setValue,
    trigger,
    onSubmit,
    handleEmailChange,
    isCheckingEmail,
    resetMode,
    watchedConfirmPassword,
    watchedPassword,
  } = useAuthForm(onSuccess);
  const passwordValue = watchedPassword ?? "";
  const confirmPasswordValue = watchedConfirmPassword ?? "";

  const handlePasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFormValue: UseFormSetValue<SignUpFormData>,
    triggerValidation: UseFormTrigger<SignUpFormData>
  ) => {
    setApiError(null);
    setFormValue("password", e.target.value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    triggerValidation("confirmPassword").catch((error: unknown) => {
      setApiError(
        error instanceof Error
          ? error.message
          : "Could not validate password confirmation"
      );
    });
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFormValue: UseFormSetValue<SignUpFormData>,
    _triggerValidation: UseFormTrigger<SignUpFormData>
  ) => {
    setApiError(null);
    setFormValue("confirmPassword", e.target.value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const confirmPasswordErrors = getConfirmPasswordErrors(
    passwordMismatchError,
    errors.confirmPassword
  );

  const formIsValid = isFormValid(
    mode,
    errors,
    passwordValue,
    confirmPasswordValue
  );

  return (
    <div className="mx-auto w-full max-w-md p-6">
      <AuthHeader mode={mode} />

      <AuthSocialProviders />
      <AuthDivider />

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <AuthEmailField
          errors={errors}
          isCheckingEmail={isCheckingEmail}
          isSubmitting={isSubmitting}
          onEmailChange={handleEmailChange}
          register={register}
        />

        <AuthPasswordField
          errors={errors}
          isSignUp={mode === "signUp"}
          isSubmitting={isSubmitting}
          onPasswordChange={handlePasswordChange}
          passwordLength={passwordValue.length}
          register={register}
          setValue={setValue}
          trigger={trigger}
        />

        <AuthForgotPasswordLink mode={mode} />

        <AuthConfirmPassword
          confirmPasswordErrors={confirmPasswordErrors}
          isSubmitting={isSubmitting}
          mode={mode}
          onConfirmPasswordChange={handleConfirmPasswordChange}
          register={register}
          setValue={setValue}
          trigger={trigger}
        />

        <AuthSubmitButton
          apiError={apiError}
          isCheckingEmail={isCheckingEmail}
          isFormValid={formIsValid}
          isSubmitting={isSubmitting}
          mode={mode}
        />

        {mode === "signUp" && (
          <p className="text-center text-muted-foreground text-xs">
            By creating an account, you agree to our{" "}
            <Link
              className="underline hover:text-foreground"
              href="/terms"
              target="_blank"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              className="underline hover:text-foreground"
              href="/privacy"
              target="_blank"
            >
              Privacy Policy
            </Link>
            .
          </p>
        )}

        <AuthHelperText mode={mode} onResetMode={resetMode} />
      </form>
    </div>
  );
}
