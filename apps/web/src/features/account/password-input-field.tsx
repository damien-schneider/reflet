"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { FieldError } from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { InputGroup, InputGroupAddon } from "@ctrl-ui/react/ui/input-group";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { SettingsRow } from "@/features/project/components/settings-page";

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
    <SettingsRow htmlFor={id} label={label}>
      <div className="flex w-full flex-col gap-1.5">
        <InputGroup>
          <Input
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
      </div>
    </SettingsRow>
  );
}
