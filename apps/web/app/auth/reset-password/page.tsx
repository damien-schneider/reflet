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
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    confirmPassword: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
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
          ? "Le lien de réinitialisation est invalide ou a expiré."
          : "Une erreur est survenue."
      );
    } else if (!token) {
      setStatus("invalid");
    }
  }, [error, token]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setApiError("Token de réinitialisation manquant.");
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
          result.error.message ?? "Une erreur est survenue. Veuillez réessayer."
        );
        return;
      }

      setStatus("success");
    } catch {
      setApiError("Une erreur est survenue. Veuillez réessayer.");
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
                aria-label="Icône erreur"
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
            Lien invalide
          </H1>
          <Muted className="mb-6">
            Ce lien de réinitialisation est invalide. Veuillez demander un
            nouveau lien.
          </Muted>
          <Link href="/auth/forgot-password">
            <Button>Demander un nouveau lien</Button>
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
                aria-label="Icône erreur"
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
            Erreur
          </H1>
          <Muted className="mb-6">
            {apiError ??
              "Le lien de réinitialisation est invalide ou a expiré."}
          </Muted>
          <Link href="/auth/forgot-password">
            <Button>Demander un nouveau lien</Button>
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
                aria-label="Icône succès"
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
            Mot de passe réinitialisé
          </H1>
          <Muted className="mb-6">
            Votre mot de passe a été réinitialisé avec succès. Vous pouvez
            maintenant vous connecter avec votre nouveau mot de passe.
          </Muted>
          <Button className="w-full" onClick={() => router.push("/")}>
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md p-6">
        <H1 className="mb-2 text-center" variant="page">
          Nouveau mot de passe
        </H1>
        <Muted className="mb-6 text-center">
          Choisissez un nouveau mot de passe pour votre compte.
        </Muted>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Field className="relative">
            <FieldLabel htmlFor="password">Nouveau mot de passe</FieldLabel>
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
            <FieldLabel htmlFor="confirmPassword">
              Confirmer le mot de passe
            </FieldLabel>
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
                Réinitialisation...
              </>
            ) : (
              "Réinitialiser le mot de passe"
            )}
          </Button>

          <div className="text-center">
            <Link
              className="font-medium text-olive-600 text-sm hover:underline"
              href="/"
            >
              Retour à la connexion
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
