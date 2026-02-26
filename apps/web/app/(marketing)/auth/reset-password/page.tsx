"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { H1, Muted } from "@/components/ui/typography";
import { authClient } from "@/lib/auth-client";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const error = searchParams.get("error");

  const [status, setStatus] = useState<
    "form" | "success" | "error" | "invalid"
  >("form");
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const watchedPassword = watch("password");
  const watchedConfirmPassword = watch("confirmPassword");

  useEffect(() => {
    if (error) {
      setStatus("error");
      setApiError(
        error === "invalid_token"
          ? "The reset link is invalid or has expired."
          : "An error occurred."
      );
    } else if (!token) {
      setStatus("invalid");
    }
  }, [error, token]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setApiError("Reset token is missing.");
      return;
    }

    setApiError(null);

    try {
      const result = await authClient.resetPassword({
        newPassword: data.password,
        token,
      });

      if (result.error) {
        setApiError(
          result.error.message ?? "An error occurred. Please try again."
        );
        return;
      }

      setStatus("success");
    } catch {
      setApiError("An error occurred. Please try again.");
    }
  };

  const isFormValid = () => {
    return (
      watchedPassword.length >= 8 &&
      watchedConfirmPassword.length >= 8 &&
      watchedPassword === watchedConfirmPassword
    );
  };

  if (status === "invalid") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md p-6 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg
                aria-label="Error icon"
                className="h-8 w-8 text-red-600"
                fill="none"
                role="img"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M6 18L18 6M6 6l12 12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </div>
          </div>
          <H1 className="mb-2" variant="page">
            Invalid link
          </H1>
          <Muted className="mb-6">
            This reset link is invalid. Please request a new link.
          </Muted>
          <Link href="/auth/forgot-password">
            <Button>Request a new link</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md p-6 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg
                aria-label="Error icon"
                className="h-8 w-8 text-red-600"
                fill="none"
                role="img"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M6 18L18 6M6 6l12 12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </div>
          </div>
          <H1 className="mb-2" variant="page">
            Error
          </H1>
          <Muted className="mb-6">
            {apiError ?? "The reset link is invalid or has expired."}
          </Muted>
          <Link href="/auth/forgot-password">
            <Button>Request a new link</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md p-6 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg
                aria-label="Success icon"
                className="h-8 w-8 text-green-600"
                fill="none"
                role="img"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M5 13l4 4L19 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </div>
          </div>
          <H1 className="mb-2" variant="page">
            Password reset
          </H1>
          <Muted className="mb-6">
            Your password has been successfully reset. You can now sign in with
            your new password.
          </Muted>
          <Button className="w-full" onClick={() => router.push("/")}>
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md p-6">
        <H1 className="mb-2 text-center" variant="page">
          New password
        </H1>
        <Muted className="mb-6 text-center">
          Choose a new password for your account.
        </Muted>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Field className="relative">
            <FieldLabel htmlFor="password">New password</FieldLabel>
            <Input
              disabled={isSubmitting}
              id="password"
              type="password"
              {...register("password")}
            />
            <FieldError
              className="absolute top-full left-0"
              errors={errors.password ? [errors.password] : undefined}
            />
          </Field>

          <Field className="relative">
            <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
            <Input
              disabled={isSubmitting}
              id="confirmPassword"
              type="password"
              {...register("confirmPassword")}
            />
            <FieldError
              className="absolute top-full left-0"
              errors={
                errors.confirmPassword ? [errors.confirmPassword] : undefined
              }
            />
          </Field>

          {apiError && (
            <FieldError className="mt-2" errors={[{ message: apiError }]} />
          )}

          <Button
            className="mt-6 w-full"
            disabled={isSubmitting || !isFormValid()}
            type="submit"
          >
            {isSubmitting ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Resetting...
              </>
            ) : (
              "Reset password"
            )}
          </Button>

          <div className="text-center">
            <Link
              className="font-medium text-olive-600 text-sm hover:underline"
              href="/"
            >
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
