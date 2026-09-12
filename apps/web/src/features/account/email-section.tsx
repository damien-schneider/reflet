"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Field, FieldError, FieldLabel } from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { Separator } from "@ctrl-ui/react/ui/separator";
import { toast } from "@ctrl-ui/react/ui/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Envelope } from "@phosphor-icons/react";
import { useForm } from "react-hook-form";
import { H3, Muted, Text } from "@/components/ui/typography";
import {
  type UpdateEmailForm,
  updateEmailSchema,
} from "@/features/account/account-schemas";
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
  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors },
    reset: resetEmail,
  } = useForm<UpdateEmailForm>({
    defaultValues: {
      newEmail: "",
    },
    mode: "onChange",
    resolver: zodResolver(updateEmailSchema),
  });

  const handleUpdateEmail = async (data: UpdateEmailForm) => {
    setIsLoading(true);
    try {
      await authClient.changeEmail({
        callbackURL: `${window.location.origin}/dashboard/account`,
        newEmail: data.newEmail,
      });
      toast.success("Email updated. Please check your inbox for verification.");
      resetEmail();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update email"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <H3 variant="section">Email</H3>

      <div className="flex items-center gap-4 rounded-lg bg-muted p-4">
        <div className="flex size-12 items-center justify-center rounded-none bg-background">
          <Envelope className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <Muted>Current Email</Muted>
          <Text variant="label">{user?.email ?? "N/A"}</Text>
        </div>
      </div>

      <Separator />

      <form
        className="space-y-4"
        onSubmit={handleSubmitEmail(handleUpdateEmail)}
      >
        <Field>
          <FieldLabel htmlFor="newEmail">New Email</FieldLabel>
          <Input
            id="newEmail"
            placeholder="new@example.com"
            type="email"
            {...registerEmail("newEmail")}
          />
          <FieldError match={Boolean(emailErrors.newEmail?.message)}>
            {emailErrors.newEmail?.message}
          </FieldError>
        </Field>

        <Button
          className="w-full md:w-auto"
          disabled={isLoading}
          tone="primary"
          type="submit"
          variant="solid"
        >
          <Check className="mr-2 size-4" />
          Update Email
        </Button>
      </form>
    </section>
  );
}
