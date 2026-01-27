"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { H1, Muted } from "@/components/ui/typography";
import { authClient } from "@/lib/auth-client";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const token = searchParams.get("token");
  const error = searchParams.get("error");

  useEffect(() => {
    // If there's an error in the URL, show it
    if (error) {
      setStatus("error");
      setErrorMessage(
        error === "invalid_token"
          ? "Le lien de vérification est invalide ou a expiré."
          : "Une erreur est survenue lors de la vérification."
      );
      return;
    }

    // If there's a token, verify it
    if (token) {
      authClient
        .verifyEmail({
          query: { token },
        })
        .then((result) => {
          if (result.error) {
            setStatus("error");
            setErrorMessage(
              result.error.message ??
                "Une erreur est survenue lors de la vérification."
            );
          } else {
            setStatus("success");
          }
        })
        .catch(() => {
          setStatus("error");
          setErrorMessage("Une erreur est survenue lors de la vérification.");
        });
    } else {
      // No token and no error - check if user is already verified
      setStatus("success");
    }
  }, [token, error]);

  const handleContinue = () => {
    router.push("/dashboard");
  };

  const handleResendEmail = async () => {
    const session = await authClient.getSession();
    if (session?.data?.user?.email) {
      try {
        await authClient.sendVerificationEmail({
          email: session.data.user.email,
          callbackURL: "/auth/verify-email",
        });
        setErrorMessage("Un nouvel email de vérification a été envoyé.");
      } catch {
        setErrorMessage("Impossible d'envoyer l'email. Veuillez réessayer.");
      }
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8" />
          <Muted>Vérification en cours...</Muted>
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
            Vérification échouée
          </H1>
          <Muted className="mb-6">
            {errorMessage ??
              "Le lien de vérification est invalide ou a expiré."}
          </Muted>
          <div className="flex flex-col gap-3">
            <Button onClick={handleResendEmail} variant="default">
              Renvoyer l'email de vérification
            </Button>
            <Button onClick={() => router.push("/")} variant="outline">
              Retour à l'accueil
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
          Email vérifié
        </H1>
        <Muted className="mb-6">
          Votre adresse email a été vérifiée avec succès. Vous pouvez maintenant
          accéder à toutes les fonctionnalités de votre compte.
        </Muted>
        <Button className="w-full" onClick={handleContinue}>
          Continuer vers le tableau de bord
        </Button>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
