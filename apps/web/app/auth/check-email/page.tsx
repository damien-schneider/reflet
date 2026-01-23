"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { H1, Muted } from "@/components/ui/typography";
import { authClient } from "@/lib/auth-client";

function CheckEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const [isResending, setIsResending] = useState(false);

  const handleResendEmail = async () => {
    if (!email) {
      toast.error("Adresse email non trouvée.");
      return;
    }

    setIsResending(true);
    try {
      await authClient.sendVerificationEmail({
        email,
        callbackURL: "/auth/verify-email",
      });
      toast.success("Email de vérification renvoyé.");
    } catch {
      toast.error("Impossible d'envoyer l'email. Veuillez réessayer.");
    } finally {
      setIsResending(false);
    }
  };

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
          Nous avons envoyé un email de vérification à :
        </Muted>
        {email && <p className="mb-6 font-medium text-foreground">{email}</p>}
        <Muted className="mb-6">
          Cliquez sur le lien dans l'email pour activer votre compte. Si vous ne
          trouvez pas l'email, vérifiez votre dossier spam.
        </Muted>
        <div className="flex flex-col gap-3">
          <Button
            disabled={isResending || !email}
            onClick={handleResendEmail}
            variant="default"
          >
            {isResending ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Envoi en cours...
              </>
            ) : (
              "Renvoyer l'email de vérification"
            )}
          </Button>
          <Button onClick={() => router.push("/")} variant="outline">
            Retour à l'accueil
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <CheckEmailContent />
    </Suspense>
  );
}
