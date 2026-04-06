"use client";

import { Plus } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InvitationList } from "@/features/members/components/invitation-list";
import { InviteMemberDialog } from "@/features/members/components/invite-member-dialog";
import { MemberList } from "@/features/members/components/member-list";
import { RemoveMemberDialog } from "@/features/members/components/remove-member-dialog";

interface MembersSectionProps {
  isAdmin: boolean;
  organizationId: Id<"organizations">;
}

export function MembersSection({
  isAdmin,
  organizationId,
}: MembersSectionProps) {
  const members = useQuery(api.organizations.members.list, { organizationId });
  const invitations = useQuery(
    api.organizations.invitation_queries.listPending,
    {
      organizationId,
    }
  );
  const currentMember = useQuery(api.organizations.members.getCurrentMember, {
    organizationId,
  });
  const removeMember = useMutation(api.organizations.members.remove);

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [removingMember, setRemovingMember] = useState<{
    id: Id<"organizationMembers">;
    name: string;
  } | null>(null);

  const isOwner = currentMember?.role === "owner";
  const memberCount = members?.length ?? 0;

  const handleRemoveMember = async () => {
    if (!removingMember) {
      return;
    }
    await removeMember({
      organizationId,
      memberId: removingMember.id,
    });
    setRemovingMember(null);
  };

  return (
    <div className="space-y-4">
      {isAdmin ? (
        <div className="flex justify-end">
          <Button onClick={() => setIsInviteDialogOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {memberCount} member{memberCount === 1 ? "" : "s"} in this
            organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MemberList
            isOwner={isOwner}
            members={members}
            onRemoveMember={(id, name) => setRemovingMember({ id, name })}
          />
        </CardContent>
      </Card>

      {invitations && invitations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              {invitations.length} pending invitation
              {invitations.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InvitationList invitations={invitations} />
          </CardContent>
        </Card>
      ) : null}

      <InviteMemberDialog
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
    </div>
  );
}
