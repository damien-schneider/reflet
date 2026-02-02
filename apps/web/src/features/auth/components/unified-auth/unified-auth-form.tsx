"use client";

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
  const hasErrors = Object.keys(errors).length > 0;
  if (hasErrors) {
    return false;
  }

  if (mode === "signUp") {
    return (
      watchedPassword.length >= 8 &&
      watchedConfirmPassword.length >= 8 &&
      watchedPassword === watchedConfirmPassword
    );
  }

  return watchedPassword.length >= 8;
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
    watch,
    setValue,
    trigger,
    onSubmit,
    handleEmailChange,
    isCheckingEmail,
    resetMode,
  } = useAuthForm(onSuccess);

  const watchedPassword = watch("password");
  const watchedConfirmPassword = watch("confirmPassword");

  const handlePasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFormValue: (name: keyof SignUpFormData, value: string) => void,
    triggerValidation: (name: keyof SignUpFormData) => Promise<boolean>
  ) => {
    setApiError(null);
    setFormValue("password", e.target.value);
    triggerValidation("password");
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFormValue: (name: keyof SignUpFormData, value: string) => void,
    triggerValidation: (name: keyof SignUpFormData) => Promise<boolean>
  ) => {
    setApiError(null);
    setFormValue("confirmPassword", e.target.value);
    triggerValidation("confirmPassword");
  };

  const confirmPasswordErrors = getConfirmPasswordErrors(
    passwordMismatchError,
    errors.confirmPassword
  );

  const formIsValid = isFormValid(
    mode,
    errors,
    watchedPassword,
    watchedConfirmPassword
  );

  return (
    <div className="w-full max-w-md p-6">
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
          isSubmitting={isSubmitting}
          onPasswordChange={handlePasswordChange}
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

        <AuthHelperText mode={mode} onResetMode={resetMode} />
      </form>
    </div>
  );
}
