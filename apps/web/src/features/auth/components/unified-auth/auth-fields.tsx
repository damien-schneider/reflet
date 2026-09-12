"use client";

import { Field, FieldError, FieldLabel } from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { SignUpFormData } from "./lib/auth-validation";

interface AuthEmailFieldProps {
  errors: FieldErrors<SignUpFormData>;
  isCheckingEmail: boolean;
  isSubmitting: boolean;
  onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  register: UseFormRegister<SignUpFormData>;
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
        match={Boolean(errors.email?.message)}
      >
        {errors.email?.message}
      </FieldError>
    </Field>
  );
}

interface AuthPasswordFieldProps {
  errors: FieldErrors<SignUpFormData>;
  isSignUp: boolean;
  isSubmitting: boolean;
  onPasswordChange: (
    e: React.ChangeEvent<HTMLInputElement>,
    setValue: (name: keyof SignUpFormData, value: string) => void,
    trigger: (name: keyof SignUpFormData) => Promise<boolean>
  ) => void;
  passwordLength: number;
  register: UseFormRegister<SignUpFormData>;
  setValue: (name: keyof SignUpFormData, value: string) => void;
  trigger: (name: keyof SignUpFormData) => Promise<boolean>;
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
            {remainingChars} more character{remainingChars === 1 ? "" : "s"}{" "}
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
        match={Boolean(errors.password?.message)}
      >
        {errors.password?.message}
      </FieldError>
    </Field>
  );
}
