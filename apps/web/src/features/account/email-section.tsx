"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Envelope } from "@phosphor-icons/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  type UpdateEmailForm,
  updateEmailSchema,
} from "@/features/account/account-schemas";
import { authClient } from "@/lib/auth-client";

interface EmailSectionProps {
  user: { email?: string | null } | undefined;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
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
    resolver: zodResolver(updateEmailSchema),
    mode: "onChange",
    defaultValues: {
      newEmail: "",
    },
  });

  const handleUpdateEmail = async (data: UpdateEmailForm) => {
    setIsLoading(true);
    try {
      await authClient.changeEmail({
        newEmail: data.newEmail,
        callbackURL: `${window.location.origin}/dashboard/account`,
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
    <Card>
      <CardHeader>
        <CardTitle>Email</CardTitle>
        <CardDescription>Change your email address</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4 rounded-lg bg-muted p-4">
          <div className="flex size-12 items-center justify-center rounded-none bg-background">
            <Envelope className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-muted-foreground text-sm">Current Email</p>
            <p className="font-medium">{user?.email ?? "N/A"}</p>
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
            <FieldError
              errors={emailErrors.newEmail ? [emailErrors.newEmail] : undefined}
            />
          </Field>

          <Button
            className="w-full md:w-auto"
            disabled={isLoading}
            type="submit"
          >
            <Check className="mr-2 size-4" />
            Update Email
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
