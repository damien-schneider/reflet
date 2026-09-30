"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Field, FieldError, FieldLabel } from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { toast } from "@ctrl-ui/react/ui/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  type UpdateEmailForm,
  updateEmailSchema,
} from "@/features/account/account-schemas";
import { SettingsSection } from "@/features/project/components/settings-page";
import { authClient } from "@/lib/auth-client";

interface EmailSectionProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  user: { email?: string | null } | undefined;
}

export function EmailSection({
  user,
  isLoading,
  setIsLoading,
}: EmailSectionProps) {
  const [requestedEmail, setRequestedEmail] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdateEmailForm>({
    defaultValues: { newEmail: "" },
    mode: "onTouched",
    resolver: zodResolver(updateEmailSchema),
  });

  const handleUpdateEmail = async (data: UpdateEmailForm) => {
    setIsLoading(true);
    try {
      await authClient.changeEmail({
        callbackURL: `${window.location.origin}/dashboard/account`,
        newEmail: data.newEmail,
      });
      setRequestedEmail(data.newEmail);
      reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update email"
      );
    }
    setIsLoading(false);
  };

  const currentEmail = user?.email;

  return (
    <SettingsSection
      description={
        currentEmail ? (
          <>
            You sign in with{" "}
            <span className="text-foreground">{currentEmail}</span>.
          </>
        ) : (
          "No email address is linked to this account."
        )
      }
      title="Email"
    >
      <form
        className="flex max-w-md flex-col gap-4"
        noValidate
        onSubmit={handleSubmit(handleUpdateEmail)}
      >
        <Field>
          <FieldLabel htmlFor="newEmail">New email</FieldLabel>
          <Input
            aria-invalid={Boolean(errors.newEmail) || undefined}
            autoComplete="email"
            id="newEmail"
            placeholder="new@example.com"
            spellCheck={false}
            type="email"
            {...register("newEmail")}
          />
          <FieldError match={Boolean(errors.newEmail?.message)}>
            {errors.newEmail?.message}
          </FieldError>
        </Field>

        <output
          aria-live="polite"
          className="text-body text-muted-foreground empty:hidden"
        >
          {requestedEmail
            ? `Check ${requestedEmail} for a link to confirm the change.`
            : null}
        </output>

        <div>
          <Button
            disabled={isLoading}
            tone="primary"
            type="submit"
            variant="solid"
          >
            {isLoading ? "Sending…" : "Change email"}
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}
