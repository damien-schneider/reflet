"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { H1, Muted } from "@/components/ui/typography";

interface AcceptInvitationContentProps {
  token: string;
}

export function AcceptInvitationContent({
  token,
}: AcceptInvitationContentProps) {
  const router = useRouter();
  const invitation = useQuery(api.invitations.getByToken, { token });
  const acceptInvitation = useMutation(api.invitations.accept);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Loading state
  if (invitation === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8" />
          <Muted>Chargement de l'invitation...</Muted>
        </div>
      </div>
    );
  }

  // Invalid token
  if (invitation === null) {
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
            Invitation invalide
          </H1>
          <Muted className="mb-6">
            Cette invitation n'existe pas ou a été annulée.
          </Muted>
          <Button onClick={() => router.push("/")} variant="outline">
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  // Check if expired
  const isExpired = invitation.expiresAt < Date.now();
  if (isExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md p-6 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
              <svg
                aria-label="Icône expirée"
                className="h-8 w-8 text-yellow-600"
                fill="none"
                role="img"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </div>
          </div>
          <H1 className="mb-2" variant="page">
            Invitation expirée
          </H1>
          <Muted className="mb-6">
            Cette invitation a expiré. Veuillez demander une nouvelle invitation
            à l'administrateur de l'organisation.
          </Muted>
          <Button onClick={() => router.push("/")} variant="outline">
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  // Already accepted
  if (invitation.status === "accepted") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md p-6 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <svg
                aria-label="Icône information"
                className="h-8 w-8 text-blue-600"
                fill="none"
                role="img"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </div>
          </div>
          <H1 className="mb-2" variant="page">
            Invitation déjà acceptée
          </H1>
          <Muted className="mb-6">
            Cette invitation a déjà été acceptée. Vous êtes peut-être déjà
            membre de cette organisation.
          </Muted>
          <Button onClick={() => router.push("/dashboard")} variant="default">
            Aller au tableau de bord
          </Button>
        </div>
      </div>
    );
  }

  const roleLabel = invitation.role === "admin" ? "administrateur" : "membre";

  const handleAccept = async () => {
    setIsAccepting(true);
    setError(null);
    try {
      await acceptInvitation({ token });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      setIsAccepting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md p-6 text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              aria-label="Icône invitation"
              className="h-8 w-8 text-green-600"
              fill="none"
              role="img"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
        </div>
        <H1 className="mb-2" variant="page">
          Rejoindre {invitation.organizationName}
        </H1>
        <Muted className="mb-6">
          Vous avez été invité à rejoindre l'organisation{" "}
          <strong>{invitation.organizationName}</strong> en tant que {roleLabel}
          .
        </Muted>
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-red-600 text-sm">
            {error}
          </div>
        )}
        <div className="flex flex-col gap-3">
          <Button disabled={isAccepting} onClick={handleAccept}>
            {isAccepting ? "Acceptation en cours..." : "Accepter l'invitation"}
          </Button>
          <Button
            disabled={isAccepting}
            onClick={() => router.push("/")}
            variant="outline"
          >
            Refuser
          </Button>
        </div>
      </div>
    </div>
  );
}
