"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Field, FieldError, FieldLabel } from "@ctrl-ui/react/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@ctrl-ui/react/ui/input-group";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import type { UseFormRegisterReturn } from "react-hook-form";

interface PasswordInputProps {
  autoComplete: "current-password" | "new-password";
  error?: { message?: string };
  id: string;
  label: string;
  onTogglePassword: () => void;
  placeholder?: string;
  register: UseFormRegisterReturn;
  showPassword: boolean;
}

export function PasswordInputField({
  autoComplete,
  id,
  label,
  showPassword,
  onTogglePassword,
  register,
  placeholder,
  error,
}: PasswordInputProps) {
  const hasError = Boolean(error?.message);
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup>
        <InputGroupInput
          aria-invalid={hasError || undefined}
          autoComplete={autoComplete}
          id={id}
          placeholder={placeholder}
          spellCheck={false}
          type={showPassword ? "text" : "password"}
          {...register}
        />
        <InputGroupAddon className="ml-auto">
          <Button
            aria-label={showPassword ? "Hide password" : "Show password"}
            iconOnly
            onClick={onTogglePassword}
            size="xs"
            type="button"
            variant="ghost"
          >
            {showPassword ? <EyeSlash /> : <Eye />}
          </Button>
        </InputGroupAddon>
      </InputGroup>
      <FieldError match={hasError}>{error?.message}</FieldError>
    </Field>
  );
}
