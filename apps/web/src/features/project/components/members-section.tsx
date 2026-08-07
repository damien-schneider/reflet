"use client";

import { Plus } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
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

  const isOwner = currentMember?.role === "owner";

  const handleRemoveMember = async () => {
    if (!removingMember) {
      return;
    }
    await removeMember({
      memberId: removingMember.id,
      organizationId,
    });
    setRemovingMember(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-semibold text-lg">Members</h1>
        {isAdmin ? (
          <Button onClick={() => setIsInviteDialogOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Invite member
          </Button>
        ) : null}
      </div>

      <section className="space-y-4">
        <h2 className="font-medium text-sm">Team</h2>
        <MemberList
          isOwner={isOwner}
          members={members}
          onRemoveMember={(id, name) => setRemovingMember({ id, name })}
        />
      </section>

      {invitations && invitations.length > 0 ? (
        <section className="space-y-4 border-t pt-8">
          <h2 className="font-medium text-sm">Pending invitations</h2>
          <InvitationList invitations={invitations} />
        </section>
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
