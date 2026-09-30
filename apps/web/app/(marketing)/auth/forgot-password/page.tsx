"use client";

import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import { Field, FieldError, FieldLabel } from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { zodResolver } from "@hookform/resolvers/zod";
import { EnvelopeSimple } from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { H1, Muted } from "@/components/ui/typography";
import {
  AuthPageShell,
  AuthStatus,
} from "@/features/auth/components/auth-page-shell";
import { authClient } from "@/lib/auth-client";

const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address, like name@example.com"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const SEND_ERROR_MESSAGE =
  "Unable to send the reset link. Check your connection and try again.";

function ForgotPasswordContent() {
  const prefilledEmail = useSearchParams().get("email") ?? "";
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    defaultValues: { email: prefilledEmail },
    mode: "onTouched",
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      const result = await authClient.requestPasswordReset({
        email: data.email,
        redirectTo: "/auth/reset-password",
      });
      if (result.error) {
        setError(
          "email",
          { message: result.error.message ?? SEND_ERROR_MESSAGE },
          { shouldFocus: true }
        );
        return;
      }
      setSubmittedEmail(data.email);
    } catch {
      setError("email", { message: SEND_ERROR_MESSAGE }, { shouldFocus: true });
    }
  };

  if (submittedEmail) {
    return (
      <AuthStatus
        actions={
          <ButtonLink render={<Link href="/dashboard" />} variant="surface">
            Back to sign in
          </ButtonLink>
        }
        icon={EnvelopeSimple}
        title="Check your inbox"
        tone="brand"
      >
        If an account exists for{" "}
        <span className="break-all font-medium text-foreground">
          {submittedEmail}
        </span>
        , you’ll get an email with a link to reset your password. Can’t find it?
        Check your spam folder.
      </AuthStatus>
    );
  }

  return (
    <AuthPageShell>
      <H1 className="mb-2 text-center" variant="page">
        Reset your password
      </H1>
      <Muted className="mb-6 text-center">
        Enter your account email and we’ll send you a reset link.
      </Muted>

      <form className="space-y-2" noValidate onSubmit={handleSubmit(onSubmit)}>
        <Field invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            autoCapitalize="none"
            autoComplete="email"
            disabled={isSubmitting}
            id="email"
            placeholder="name@example.com"
            spellCheck={false}
            type="email"
            {...register("email")}
          />
          <FieldError match={Boolean(errors.email?.message)}>
            {errors.email?.message}
          </FieldError>
        </Field>

        <Button
          className="w-full"
          disabled={isSubmitting}
          tone="primary"
          type="submit"
          variant="solid"
        >
          {isSubmitting && <Spinner data-icon="inline-start" size="xs" />}
          {isSubmitting ? "Sending…" : "Send reset link"}
        </Button>

        <div className="pt-4 text-center">
          <Link
            className="font-medium text-brand-text text-sm hover:underline"
            href="/dashboard"
          >
            Back to sign in
          </Link>
        </div>
      </form>
    </AuthPageShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthPageShell className="flex justify-center">
          <Spinner size="lg" />
        </AuthPageShell>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
