"use client";

import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
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

const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_LENGTH_MESSAGE = `Use at least ${MIN_PASSWORD_LENGTH} characters`;
const RESET_ERROR_MESSAGE =
  "Unable to reset your password. Check your connection and try again.";

const resetPasswordSchema = z
  .object({
    confirmPassword: z.string().min(1, "Re-enter your new password"),
    password: z.string().min(MIN_PASSWORD_LENGTH, PASSWORD_LENGTH_MESSAGE),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don’t match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const linkError = searchParams.get("error");

  const [isDone, setIsDone] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    defaultValues: { confirmPassword: "", password: "" },
    mode: "onTouched",
    resolver: zodResolver(resetPasswordSchema),
  });

  if (linkError || !token) {
    return (
      <AuthStatus
        actions={
          <ButtonLink
            render={<Link href="/auth/forgot-password" />}
            tone="primary"
            variant="solid"
          >
            Request a new link
          </ButtonLink>
        }
        icon={WarningCircle}
        title="This link doesn’t work"
        tone="destructive"
      >
        {linkError && linkError !== "invalid_token"
          ? "Something went wrong with this reset link. Request a new one to continue."
          : "This reset link is invalid or has expired. Request a new one to continue."}
      </AuthStatus>
    );
  }

  if (isDone) {
    return (
      <AuthStatus
        actions={
          <ButtonLink
            render={<Link href="/dashboard" />}
            tone="primary"
            variant="solid"
          >
            Sign in
          </ButtonLink>
        }
        icon={CheckCircle}
        title="Password updated"
        tone="success"
      >
        Your password has been reset. Sign in with your new password.
      </AuthStatus>
    );
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    setApiError(null);
    try {
      const result = await authClient.resetPassword({
        newPassword: data.password,
        token,
      });
      if (result.error) {
        setApiError(result.error.message ?? RESET_ERROR_MESSAGE);
        return;
      }
      setIsDone(true);
    } catch {
      setApiError(RESET_ERROR_MESSAGE);
    }
  };

  return (
    <AuthPageShell>
      <H1 className="mb-2 text-center" variant="page">
        Choose a new password
      </H1>
      <Muted className="mb-6 text-center">
        You’ll use it the next time you sign in.
      </Muted>

      <form className="space-y-2" noValidate onSubmit={handleSubmit(onSubmit)}>
        <Field invalid={Boolean(errors.password)}>
          <FieldLabel htmlFor="password">New password</FieldLabel>
          <Input
            autoComplete="new-password"
            disabled={isSubmitting}
            id="password"
            type="password"
            {...register("password")}
          />
          {errors.password ? (
            <FieldError match>{errors.password.message}</FieldError>
          ) : (
            <FieldDescription className="min-h-[1lh] text-caption">
              {PASSWORD_LENGTH_MESSAGE}.
            </FieldDescription>
          )}
        </Field>

        <Field invalid={Boolean(errors.confirmPassword)}>
          <FieldLabel htmlFor="confirmPassword">
            Confirm new password
          </FieldLabel>
          <Input
            autoComplete="new-password"
            disabled={isSubmitting}
            id="confirmPassword"
            type="password"
            {...register("confirmPassword")}
          />
          <FieldError match={Boolean(errors.confirmPassword?.message)}>
            {errors.confirmPassword?.message}
          </FieldError>
        </Field>

        <p
          className="min-h-[1lh] text-caption text-destructive-text"
          role="alert"
        >
          {apiError}
        </p>

        <Button
          className="w-full"
          disabled={isSubmitting}
          tone="primary"
          type="submit"
          variant="solid"
        >
          {isSubmitting && <Spinner data-icon="inline-start" size="xs" />}
          {isSubmitting ? "Resetting…" : "Reset password"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthPageShell className="flex justify-center">
          <Spinner size="lg" />
        </AuthPageShell>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
