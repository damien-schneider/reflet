"use client";

import { Alert, AlertDescription } from "@ctrl-ui/react/ui/alert";
import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ctrl-ui/react/ui/card";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { H1, Muted } from "@/components/ui/typography";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { OrgAvatar } from "@/features/organizations/components/org-avatar";

type PendingInvitation = FunctionReturnType<
  typeof api.organizations.invitations.listMyPendingInvitations
>[number];

export function PendingInvitationsList() {
  const router = useRouter();
  const invitations = useQuery(
    api.organizations.invitations.listMyPendingInvitations
  );
  const acceptInvitation = useMutation(
    api.organizations.invitation_actions.accept
  );
  const [acceptingToken, setAcceptingToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (invitations === undefined) {
    return (
      <AuthPageShell className="flex justify-center">
        <Spinner size="lg" />
      </AuthPageShell>
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
      setError(
        err instanceof Error
          ? err.message
          : "Couldn’t accept the invitation. Try again, or open its details."
      );
      setAcceptingToken(null);
    }
  };

  return (
    <AuthPageShell className="max-w-lg">
      <div className="mb-8 text-center">
        <H1 className="mb-2" variant="page">
          Pending invitations
        </H1>
        <Muted className="text-pretty">
          Accept an invitation to join that organization’s workspace.
        </Muted>
      </div>

      {error && (
        <Alert className="mb-4" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {invitations.length === 0 ? (
        <Muted className="text-center">No pending invitations left.</Muted>
      ) : (
        <ul className="space-y-4">
          {invitations.map((invitation) => (
            <li key={invitation._id}>
              <InvitationCard
                acceptingToken={acceptingToken}
                invitation={invitation}
                onAccept={handleAccept}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 text-center">
        <ButtonLink render={<Link href="/dashboard" />} variant="ghost">
          Skip for now
        </ButtonLink>
      </div>
    </AuthPageShell>
  );
}

function InvitationCard({
  acceptingToken,
  invitation,
  onAccept,
}: {
  acceptingToken: string | null;
  invitation: PendingInvitation;
  onAccept: (token: string) => void;
}) {
  const isAccepting = acceptingToken === invitation.token;
  const { organizationName } = invitation;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <OrgAvatar
            org={{
              logo: invitation.organizationLogo,
              name: organizationName,
            }}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate">{organizationName}</CardTitle>
            <CardDescription>
              Join as {invitation.role === "admin" ? "admin" : "member"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          <Button
            className="flex-1"
            disabled={acceptingToken !== null}
            onClick={() => onAccept(invitation.token)}
            tone="primary"
            variant="solid"
          >
            {isAccepting && <Spinner data-icon="inline-start" size="xs" />}
            {isAccepting ? "Accepting…" : "Accept invitation"}
          </Button>
          <ButtonLink
            render={<Link href={`/invite/${invitation.token}`} />}
            variant="surface"
          >
            View details
          </ButtonLink>
        </div>
      </CardContent>
    </Card>
  );
}
