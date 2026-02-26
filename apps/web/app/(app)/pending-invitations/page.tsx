"use client";

import { UserPlus } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { H1, Muted } from "@/components/ui/typography";
import { authClient } from "@/lib/auth-client";

export default function PendingInvitationsPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionLoading } =
    authClient.useSession();
  const invitations = useQuery(api.invitations.listMyPendingInvitations);
  const acceptInvitation = useMutation(api.invitations.accept);
  const [acceptingToken, setAcceptingToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Determine redirect conditions
  const shouldRedirectToLogin = !(isSessionLoading || session?.user);
  const shouldRedirectToDashboard =
    invitations !== undefined && invitations.length === 0;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (shouldRedirectToLogin) {
      router.push("/auth/sign-in");
    }
  }, [shouldRedirectToLogin, router]);

  // Redirect to dashboard if no pending invitations
  useEffect(() => {
    if (shouldRedirectToDashboard) {
      router.push("/dashboard");
    }
  }, [shouldRedirectToDashboard, router]);

  // Show loading state while checking auth or loading invitations
  if (isSessionLoading || invitations === undefined || shouldRedirectToLogin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8" />
          <Muted>Chargement des invitations...</Muted>
        </div>
      </div>
    );
  }

  // No pending invitations - show loading while redirecting
  if (invitations.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8" />
          <Muted>Redirection...</Muted>
        </div>
      </div>
    );
  }

  const handleAccept = async (token: string) => {
    setAcceptingToken(token);
    setError(null);
    try {
      await acceptInvitation({ token });
      // If this was the last invitation, redirect to dashboard
      if (invitations.length === 1) {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      setAcceptingToken(null);
    }
  };

  const handleSkip = () => {
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-olive-100">
            <UserPlus className="h-8 w-8 text-olive-600" />
          </div>
          <H1 className="mb-2" variant="page">
            Invitations en attente
          </H1>
          <Muted>
            Vous avez {invitations.length} invitation
            {invitations.length > 1 ? "s" : ""} en attente
          </Muted>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-center text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {invitations.map((invitation) => {
            const roleLabel =
              invitation.role === "admin" ? "Administrateur" : "Membre";
            const initials =
              invitation.organizationName
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) ?? "??";

            return (
              <Card key={invitation._id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={invitation.organizationLogo} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {invitation.organizationName}
                      </CardTitle>
                      <CardDescription>
                        Invité en tant que {roleLabel}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <Button
                      className="flex-1"
                      disabled={acceptingToken === invitation.token}
                      onClick={() => handleAccept(invitation.token)}
                    >
                      {acceptingToken === invitation.token
                        ? "Acceptation..."
                        : "Accepter"}
                    </Button>
                    <Button
                      disabled={acceptingToken === invitation.token}
                      onClick={() => router.push(`/invite/${invitation.token}`)}
                      variant="outline"
                    >
                      Voir les détails
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Button onClick={handleSkip} variant="ghost">
            Passer pour le moment
          </Button>
        </div>
      </div>
    </div>
  );
}
