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
    <Field invalid={Boolean(errors.email)}>
      <div className="flex w-full items-baseline justify-between gap-2">
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <span
          aria-live="polite"
          className="inline-flex items-center gap-1 text-muted-foreground text-xs"
        >
          {isCheckingEmail && (
            <>
              <Spinner size="xs" />
              Checking…
            </>
          )}
        </span>
      </div>
      <Input
        autoCapitalize="none"
        autoComplete="email"
        data-testid="email-input"
        id="email"
        inputMode="email"
        placeholder="name@example.com"
        spellCheck={false}
        type="email"
        {...register("email")}
        disabled={isSubmitting}
        onChange={onEmailChange}
      />
      <FieldError match={Boolean(errors.email?.message)}>
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
  // Existing accounts may predate the 8-character minimum, so the hint is sign-up only.
  const showHint = isSignUp && passwordLength > 0 && remainingChars > 0;

  return (
    <Field invalid={Boolean(errors.password)}>
      <div className="flex w-full items-baseline justify-between gap-2">
        <FieldLabel htmlFor="password">Password</FieldLabel>
        {showHint && (
          <span className="text-muted-foreground text-xs tabular-nums">
            {remainingChars} more character{remainingChars === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <Input
        autoComplete={isSignUp ? "new-password" : "current-password"}
        data-testid="password-input"
        id="password"
        type="password"
        {...register("password")}
        disabled={isSubmitting}
        onChange={(e) => onPasswordChange(e, setValue, trigger)}
      />
      <FieldError match={Boolean(errors.password?.message)}>
        {errors.password?.message}
      </FieldError>
    </Field>
  );
}
