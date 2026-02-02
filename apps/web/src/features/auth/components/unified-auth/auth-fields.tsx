"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { SignUpFormData } from "./lib/auth-validation";

interface AuthEmailFieldProps {
  register: UseFormRegister<SignUpFormData>;
  errors: FieldErrors<SignUpFormData>;
  isSubmitting: boolean;
  isCheckingEmail: boolean;
  onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function AuthEmailField({
  register,
  errors,
  isSubmitting,
  isCheckingEmail,
  onEmailChange,
}: AuthEmailFieldProps) {
  return (
    <Field className="relative">
      <FieldLabel className="justify-between" htmlFor="email">
        Email
        {isCheckingEmail && (
          <div className="inline-flex w-fit! gap-1 text-muted-foreground text-xs">
            <Spinner />
            <p className="">Checking email...</p>
          </div>
        )}
      </FieldLabel>
      <Input
        data-testid="email-input"
        id="email"
        type="email"
        {...register("email")}
        disabled={isSubmitting}
        onChange={onEmailChange}
      />
      <FieldError
        className="absolute top-full left-0"
        errors={errors.email ? [errors.email] : undefined}
      />
    </Field>
  );
}

interface AuthPasswordFieldProps {
  register: UseFormRegister<SignUpFormData>;
  errors: FieldErrors<SignUpFormData>;
  isSubmitting: boolean;
  onPasswordChange: (
    e: React.ChangeEvent<HTMLInputElement>,
    setValue: (name: keyof SignUpFormData, value: string) => void,
    trigger: (name: keyof SignUpFormData) => Promise<boolean>
  ) => void;
  setValue: (name: keyof SignUpFormData, value: string) => void;
  trigger: (name: keyof SignUpFormData) => Promise<boolean>;
  passwordLength: number;
  isSignUp: boolean;
}

const MIN_PASSWORD_LENGTH = 8;

export function AuthPasswordField({
  register,
  errors,
  isSubmitting,
  onPasswordChange,
  setValue,
  trigger,
  passwordLength,
  isSignUp,
}: AuthPasswordFieldProps) {
  const remainingChars = MIN_PASSWORD_LENGTH - passwordLength;
  // Only show password length hint for new account creation, not for sign-in
  // (existing users may have shorter passwords)
  const showHint = isSignUp && passwordLength > 0 && remainingChars > 0;

  return (
    <Field className="relative">
      <FieldLabel className="justify-between" htmlFor="password">
        Password
        {showHint && (
          <span className="text-muted-foreground text-xs">
            {remainingChars} more character{remainingChars !== 1 ? "s" : ""}{" "}
            needed
          </span>
        )}
      </FieldLabel>
      <Input
        data-testid="password-input"
        id="password"
        type="password"
        {...register("password")}
        disabled={isSubmitting}
        onChange={(e) => onPasswordChange(e, setValue, trigger)}
      />
      <FieldError
        className="absolute top-full left-0"
        errors={errors.password ? [errors.password] : undefined}
      />
    </Field>
  );
}
