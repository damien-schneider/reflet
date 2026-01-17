import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { UserPlus } from "lucide-react";
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

export const Route = createFileRoute("/dashboard/$orgSlug/settings/members")({
  component: MembersSettingsPage,
});

function MembersSettingsPage() {
  const { orgSlug } = Route.useParams();
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const members = useQuery(
    api.members.list,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const invitations = useQuery(
    api.invitations.listPending,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );

  const removeMember = useMutation(api.members.remove);

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleRemoveMember = async () => {
    if (!(memberToRemove && org?._id)) {
      return;
    }

    try {
      await removeMember({
        memberId: memberToRemove.id as Id<"organizationMembers">,
        organizationId: org._id as Id<"organizations">,
      });
      setMemberToRemove(null);
    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  };

  if (!org) {
    return <div>Loading...</div>;
  }

  const isOwner = org.role === "owner";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                Manage who has access to your organization.
              </CardDescription>
            </div>
            <Button onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite member
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <MemberList
            isOwner={isOwner}
            members={members}
            onRemoveMember={(id, name) => setMemberToRemove({ id, name })}
          />
        </CardContent>
      </Card>

      {invitations && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              People who have been invited but haven't accepted yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InvitationList invitations={invitations} />
          </CardContent>
        </Card>
      )}

      <InviteMemberDialog
        onOpenChange={setShowInviteDialog}
        open={showInviteDialog}
        organizationId={org._id as Id<"organizations">}
      />

      <RemoveMemberDialog
        member={memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleRemoveMember}
      />
    </div>
  );
}
