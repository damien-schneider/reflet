"use client";

import { Plus, Users } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { use, useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { H1, H2, H3, Muted, Text } from "@/components/ui/typography";
import { InvitationList } from "@/features/members/components/invitation-list";
import { InviteMemberDialog } from "@/features/members/components/invite-member-dialog";
import { MemberList } from "@/features/members/components/member-list";
import { RemoveMemberDialog } from "@/features/members/components/remove-member-dialog";

export default function MembersGearPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
  const members = useQuery(
    api.organizations.members.list,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const invitations = useQuery(
    api.organizations.invitation_queries.listPending,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const currentMember = useQuery(
    api.organizations.members.getCurrentMember,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const removeMember = useMutation(api.organizations.members.remove);

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [removingMember, setRemovingMember] = useState<{
    id: Id<"organizationMembers">;
    name: string;
  } | null>(null);

  const isOwner = currentMember?.role === "owner";
  const isAdmin = currentMember?.role === "admin" || isOwner;

  if (!org) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <H2 variant="card">Organization not found</H2>
          <Muted className="mt-2">
            The organization you&apos;re looking for doesn&apos;t exist.
          </Muted>
        </div>
      </div>
    );
  }

  const handleRemoveMember = async () => {
    if (!(removingMember && org?._id)) {
      return;
    }
    await removeMember({
      organizationId: org._id,
      memberId: removingMember.id,
    });
    setRemovingMember(null);
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <H1>Members</H1>
          <Text variant="bodySmall">
            Manage your organization&apos;s team members
          </Text>
        </div>
        {isAdmin ? (
          <Button onClick={() => setIsInviteDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        ) : null}
      </div>

      <div className="space-y-8">
        <section className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <H3 variant="section">Team Members</H3>
            </div>
            <Muted>
              {members?.length ?? 0} member{members?.length === 1 ? "" : "s"} in
              this organization
            </Muted>
          </div>
          <MemberList
            isOwner={isOwner}
            members={members}
            onRemoveMember={(id, name) => setRemovingMember({ id, name })}
          />
        </section>

        {invitations && invitations.length > 0 ? (
          <>
            <Separator />
            <section className="space-y-4">
              <div>
                <H3 variant="section">Pending Invitations</H3>
                <Muted>
                  {invitations.length} pending invitation
                  {invitations.length === 1 ? "" : "s"}
                </Muted>
              </div>
              <InvitationList invitations={invitations} />
            </section>
          </>
        ) : null}
      </div>

      <InviteMemberDialog
        onOpenChange={setIsInviteDialogOpen}
        open={isInviteDialogOpen}
        organizationId={org._id}
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
