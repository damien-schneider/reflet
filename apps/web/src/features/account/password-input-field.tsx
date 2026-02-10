"use client";

import { Eye, EyeSlash } from "@phosphor-icons/react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface PasswordInputProps {
  id: string;
  label: string;
  showPassword: boolean;
  onTogglePassword: () => void;
  register: UseFormRegisterReturn;
  placeholder?: string;
  error?: { message?: string };
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
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <Input
          id={id}
          placeholder={placeholder}
          type={showPassword ? "text" : "password"}
          {...(register as React.ComponentProps<typeof Input>)}
        />
        <button
          className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={onTogglePassword}
          type="button"
        >
          {showPassword ? (
            <EyeSlash className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
        </button>
      </div>
      <FieldError errors={error ? [error] : undefined} />
    </Field>
  );
}
