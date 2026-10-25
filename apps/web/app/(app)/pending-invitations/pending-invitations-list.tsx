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
import { Heading, Text } from "@ctrl-ui/react/ui/typography";
import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { OrgAvatar } from "@/features/organizations/components/org-avatar";
import { useRememberOrganization } from "@/features/organizations/hooks/use-active-organization";

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
  const rememberOrganization = useRememberOrganization();
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
    if (acceptingToken !== null || !rememberOrganization) {
      return;
    }
    setAcceptingToken(token);
    setError(null);
    try {
      const organizationId = await acceptInvitation({ token });
      rememberOrganization(organizationId);
      setAcceptingToken(null);
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
        <Heading className="mb-2" level={1} size="display">
          Pending invitations
        </Heading>
        <Text as="p" className="text-pretty" tone="muted">
          Accept an invitation to join that organization’s workspace.
        </Text>
      </div>

      {error && (
        <Alert className="mb-4" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {invitations.length === 0 ? (
        <Text as="p" className="text-center" tone="muted">
          No pending invitations left.
        </Text>
      ) : (
        <ul className="space-y-4">
          {invitations.map((invitation) => (
            <li key={invitation._id}>
              <InvitationCard
                acceptance={{
                  canAccept: Boolean(rememberOrganization),
                  pendingToken: acceptingToken,
                }}
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
  acceptance,
  invitation,
  onAccept,
}: {
  acceptance: { canAccept: boolean; pendingToken: string | null };
  invitation: PendingInvitation;
  onAccept: (token: string) => void;
}) {
  const isAccepting = acceptance.pendingToken === invitation.token;
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
            disabled={acceptance.pendingToken !== null || !acceptance.canAccept}
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
