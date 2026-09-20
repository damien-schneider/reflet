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
  error?: { message?: string };
  id: string;
  label: string;
  onTogglePassword: () => void;
  placeholder?: string;
  register: UseFormRegisterReturn;
  showPassword: boolean;
}

export function PasswordInputField({
  id,
  label,
  showPassword,
  onTogglePassword,
  register,
  placeholder,
  error,
}: PasswordInputProps) {
  const { onChange, onBlur, ref: registerRef, ...restRegister } = register;
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup>
        <InputGroupInput
          id={id}
          onBlur={(e) => {
            onBlur(e);
          }}
          onChange={(e) => {
            onChange(e);
          }}
          placeholder={placeholder}
          ref={registerRef}
          type={showPassword ? "text" : "password"}
          {...restRegister}
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
      <FieldError match={Boolean(error?.message)}>{error?.message}</FieldError>
    </Field>
  );
}
