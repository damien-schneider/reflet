"use client";

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
import { H1 } from "@/components/ui/typography";
import { authClient } from "@/lib/auth-client";

export default function PendingInvitationsPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionLoading } =
    authClient.useSession();
  const invitations = useQuery(
    api.organizations.invitations.listMyPendingInvitations
  );
  const acceptInvitation = useMutation(
    api.organizations.invitation_actions.accept
  );
  const [acceptingToken, setAcceptingToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shouldRedirectToLogin = !(isSessionLoading || session?.user);
  const shouldRedirectToDashboard =
    invitations !== undefined && invitations.length === 0;

  useEffect(() => {
    if (shouldRedirectToLogin) {
      router.push("/auth/sign-in");
    }
  }, [shouldRedirectToLogin, router]);

  useEffect(() => {
    if (shouldRedirectToDashboard) {
      router.push("/dashboard");
    }
  }, [shouldRedirectToDashboard, router]);

  if (isSessionLoading || invitations === undefined || shouldRedirectToLogin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const handleAccept = async (token: string) => {
    setAcceptingToken(token);
    setError(null);
    try {
      await acceptInvitation({ token });
      if (invitations.length === 1) {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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
          <H1 variant="page">Pending invitations</H1>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-center text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {invitations.map((invitation) => {
            const roleLabel = invitation.role === "admin" ? "Admin" : "Member";
            const initials =
              invitation.organizationName
                ?.split(" ")
                .map((word) => word[0])
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
                      <CardDescription>{roleLabel}</CardDescription>
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
                        ? "Accepting..."
                        : "Accept"}
                    </Button>
                    <Button
                      disabled={acceptingToken === invitation.token}
                      onClick={() => router.push(`/invite/${invitation.token}`)}
                      variant="outline"
                    >
                      View details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Button onClick={handleSkip} variant="ghost">
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  );
}
