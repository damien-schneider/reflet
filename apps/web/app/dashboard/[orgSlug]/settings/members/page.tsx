"use client";

import { Plus, Users } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { use, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { H1, Text } from "@/components/ui/typography";
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
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const members = useQuery(
    api.members.list,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const invitations = useQuery(
    api.invitations.listPending,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const currentMember = useQuery(
    api.members.getCurrentMember,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const removeMember = useMutation(api.members.remove);

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [removingMember, setRemovingMember] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const isOwner = currentMember?.role === "owner";
  const isAdmin = currentMember?.role === "admin" || isOwner;

  if (!org) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="font-semibold text-xl">Organization not found</h2>
          <p className="mt-2 text-muted-foreground">
            The organization you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  const handleRemoveMember = async () => {
    if (!(removingMember && org?._id)) {
      return;
    }
    await removeMember({
      organizationId: org._id as Id<"organizations">,
      memberId: removingMember.id as Id<"organizationMembers">,
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

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription>
              {members?.length ?? 0} member{members?.length !== 1 ? "s" : ""} in
              this organization
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
                {invitations.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InvitationList invitations={invitations} />
            </CardContent>
          </Card>
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
