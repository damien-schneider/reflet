"use client";

import { Alert, AlertDescription } from "@ctrl-ui/react/ui/alert";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { CheckCircle, Clock, UsersThree, XCircle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import UnifiedAuthForm from "@/features/auth/components/unified-auth/unified-auth-form";
import { useRememberOrganization } from "@/features/organizations/hooks/use-active-organization";
import { authClient } from "@/lib/auth-client";

interface AcceptInvitationContentProps {
  token: string;
}

interface InvitationStateProps {
  children?: React.ReactNode;
  description: React.ReactNode;
  icon: React.ReactNode;
  title: React.ReactNode;
}

function InvitationState({
  children,
  description,
  icon,
  title,
}: InvitationStateProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Empty className="w-full max-w-md">
        <EmptyHeader>
          <EmptyMedia>{icon}</EmptyMedia>
          <EmptyTitle aria-level={1} role="heading">
            {title}
          </EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
        {children ? <EmptyContent>{children}</EmptyContent> : null}
      </Empty>
    </main>
  );
}

export function AcceptInvitationContent({
  token,
}: AcceptInvitationContentProps) {
  const router = useRouter();
  const invitation = useQuery(api.organizations.invitations.getByToken, {
    token,
  });
  const [openedAt] = useState(Date.now);

  if (invitation === undefined) {
    return (
      <main
        aria-busy="true"
        className="flex min-h-dvh flex-col items-center justify-center gap-3"
      >
        <Spinner size="md" />
        <p className="text-body text-muted-foreground">Loading invitation…</p>
      </main>
    );
  }

  if (invitation === null) {
    return (
      <InvitationState
        description="This invitation doesn’t exist or was canceled."
        icon={<XCircle aria-hidden className="size-6" />}
        title="Invalid invitation"
      >
        <Button onClick={() => router.push("/")} variant="surface">
          Go to homepage
        </Button>
      </InvitationState>
    );
  }

  if (invitation.expiresAt < openedAt) {
    return (
      <InvitationState
        description="This invitation has expired. Ask an organization admin to send a new one."
        icon={<Clock aria-hidden className="size-6" />}
        title="Invitation expired"
      >
        <Button onClick={() => router.push("/")} variant="surface">
          Go to homepage
        </Button>
      </InvitationState>
    );
  }

  if (invitation.status === "accepted") {
    return (
      <InvitationState
        description="This invitation was already accepted. You may already be a member of this organization."
        icon={<CheckCircle aria-hidden className="size-6" />}
        title="Invitation already accepted"
      >
        <Button
          onClick={() => router.push("/dashboard")}
          tone="primary"
          variant="solid"
        >
          Go to dashboard
        </Button>
      </InvitationState>
    );
  }

  return (
    <PendingInvitation
      email={invitation.email}
      organizationName={invitation.organizationName}
      role={invitation.role}
      token={token}
    />
  );
}

function PendingInvitation({
  email,
  organizationName,
  role,
  token,
}: {
  email: string;
  organizationName: string;
  role: string;
  token: string;
}) {
  const router = useRouter();
  const acceptInvitation = useMutation(
    api.organizations.invitation_actions.accept
  );
  const rememberOrganization = useRememberOrganization();
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = authClient.useSession();
  const isAuthenticated = Boolean(session?.user?.id);

  const handleAccept = async () => {
    if (isAccepting || !rememberOrganization) {
      return;
    }
    setIsAccepting(true);
    setError(null);
    try {
      const organizationId = await acceptInvitation({ token });
      rememberOrganization(organizationId);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsAccepting(false);
    }
  };

  return (
    <InvitationState
      description={
        <>
          You’ve been invited to join <strong>{organizationName}</strong> as{" "}
          {role === "admin" ? "an admin" : "a member"}. This invitation is for{" "}
          <strong>{email}</strong>.
        </>
      }
      icon={<UsersThree aria-hidden className="size-6" />}
      title={`Join ${organizationName}`}
    >
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {isAuthenticated ? (
        <div className="flex w-full flex-col gap-2">
          <Button
            disabled={isAccepting || !rememberOrganization}
            onClick={handleAccept}
            tone="primary"
            variant="solid"
          >
            {isAccepting ? (
              <Spinner aria-hidden data-icon="inline-start" size="xs" />
            ) : null}
            {isAccepting ? "Accepting…" : "Accept invitation"}
          </Button>
          <Button
            disabled={isAccepting}
            onClick={() => router.push("/")}
            variant="surface"
          >
            Decline
          </Button>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-4">
          <p className="text-body text-muted-foreground">
            Sign in or create an account with {email} to accept this invitation.
          </p>
          <UnifiedAuthForm />
        </div>
      )}
    </InvitationState>
  );
}
