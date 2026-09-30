"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Plus } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { InvitationList } from "@/features/members/components/invitation-list";
import { InviteMemberDialog } from "@/features/members/components/invite-member-dialog";
import { MemberList } from "@/features/members/components/member-list";
import { RemoveMemberDialog } from "@/features/members/components/remove-member-dialog";
import { SettingsPage, SettingsSection } from "./settings-page";

interface MembersSectionProps {
  isAdmin: boolean;
  organizationId: Id<"organizations">;
}

function CountBadge({ count }: { count: number | undefined }) {
  if (count === undefined) {
    return null;
  }
  return (
    <Badge size="sm">
      <span className="tabular-nums">{count}</span>
    </Badge>
  );
}

export function MembersSection({
  isAdmin,
  organizationId,
}: MembersSectionProps) {
  const members = useQuery(api.organizations.members.list, { organizationId });
  const invitations = useQuery(api.organizations.invitations.listPending, {
    organizationId,
  });
  const currentMember = useQuery(api.organizations.members.getCurrentMember, {
    organizationId,
  });
  const removeMember = useMutation(api.organizations.members.remove);

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [removingMember, setRemovingMember] = useState<{
    id: Id<"organizationMembers">;
    name: string;
  } | null>(null);

  const handleRemoveMember = async () => {
    if (!removingMember) {
      return;
    }
    await removeMember({ memberId: removingMember.id, organizationId });
    setRemovingMember(null);
  };

  return (
    <SettingsPage
      actions={
        isAdmin ? (
          <Button
            onClick={() => setIsInviteDialogOpen(true)}
            size="sm"
            tone="primary"
            variant="solid"
          >
            <Plus aria-hidden />
            Invite member
          </Button>
        ) : null
      }
      description="People who can access this organization, and what they can do."
      title="Members"
    >
      <SettingsSection
        title={
          <span className="flex items-center gap-2">
            Team <CountBadge count={members?.length} />
          </span>
        }
      >
        <Card>
          <CardContent>
            <MemberList
              isOwner={currentMember?.role === "owner"}
              members={members}
              onRemoveMember={(id, name) => setRemovingMember({ id, name })}
            />
          </CardContent>
        </Card>
      </SettingsSection>

      <SettingsSection
        title={
          <span className="flex items-center gap-2">
            Pending invitations <CountBadge count={invitations?.length} />
          </span>
        }
      >
        <Card>
          <CardContent>
            {invitations === undefined ? (
              <Skeleton aria-busy="true" className="h-12 w-full" />
            ) : null}
            {invitations?.length === 0 ? (
              <p className="py-2 text-body text-muted-foreground">
                No pending invitations.
              </p>
            ) : null}
            <InvitationList invitations={invitations} />
          </CardContent>
        </Card>
      </SettingsSection>

      <InviteMemberDialog
        canInviteAdmins={currentMember?.role === "owner"}
        onOpenChange={setIsInviteDialogOpen}
        open={isInviteDialogOpen}
        organizationId={organizationId}
      />

      {removingMember ? (
        <RemoveMemberDialog
          member={removingMember}
          onClose={() => setRemovingMember(null)}
          onConfirm={handleRemoveMember}
        />
      ) : null}
    </SettingsPage>
  );
}
