"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { H1, Muted } from "@/components/ui/typography";
import { authClient } from "@/lib/auth-client";

const forgotPasswordSchema = z.object({
  email: z.string().email("Adresse email invalide"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setApiError(null);

    try {
      const result = await authClient.forgetPassword({
        email: data.email,
        redirectTo: "/auth/reset-password",
      });

      if (result.error) {
        setApiError(
          result.error.message ?? "Une erreur est survenue. Veuillez réessayer."
        );
        return;
      }

      setSubmittedEmail(data.email);
      setIsSubmitted(true);
    } catch {
      setApiError("Une erreur est survenue. Veuillez réessayer.");
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md p-6 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-olive-100">
              <svg
                aria-label="Icône email"
                className="h-8 w-8 text-olive-600"
                fill="none"
                role="img"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </div>
          </div>
          <H1 className="mb-2" variant="page">
            Vérifiez votre boîte mail
          </H1>
          <Muted className="mb-2">
            Si un compte existe avec l'adresse email :
          </Muted>
          <p className="mb-6 font-medium text-foreground">{submittedEmail}</p>
          <Muted className="mb-6">
            Vous recevrez un email avec un lien pour réinitialiser votre mot de
            passe. Vérifiez également votre dossier spam.
          </Muted>
          <Link href="/">
            <Button variant="outline">Retour à l'accueil</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md p-6">
        <H1 className="mb-2 text-center" variant="page">
          Mot de passe oublié
        </H1>
        <Muted className="mb-6 text-center">
          Entrez votre adresse email pour recevoir un lien de réinitialisation.
        </Muted>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Field className="relative">
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              disabled={isSubmitting}
              id="email"
              type="email"
              {...register("email")}
            />
            <FieldError
              className="absolute top-full left-0"
              errors={errors.email ? [errors.email] : undefined}
            />
          </Field>

          {apiError && (
            <FieldError className="mt-2" errors={[{ message: apiError }]} />
          )}

          <Button className="mt-6 w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Envoi en cours...
              </>
            ) : (
              "Envoyer le lien de réinitialisation"
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
