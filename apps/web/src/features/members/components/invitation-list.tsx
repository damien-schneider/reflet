import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Button } from "@/components/ui/button";

interface InvitationInfo {
  _id: Id<"invitations">;
  _creationTime: number;
  email: string;
  role: "owner" | "admin" | "member";
}

interface InvitationListProps {
  invitations: InvitationInfo[] | undefined;
}

export function InvitationList({ invitations }: InvitationListProps) {
  const cancelInvitation = useMutation(api.invitations.cancel);

  const handleCancelInvitation = async (invitationId: Id<"invitations">) => {
    try {
      await cancelInvitation({
        invitationId,
      });
    } catch (error) {
      console.error("Failed to cancel invitation:", error);
    }
  };

  if (!invitations || invitations.length === 0) {
    return null;
  }

  return (
    <div className="divide-y">
      {invitations.map((invitation) => (
        <div
          className="flex items-center justify-between py-4"
          key={invitation._id}
        >
          <div>
            <p className="font-medium">{invitation.email}</p>
            <p className="text-muted-foreground text-sm">
              Invited as {invitation.role} •{" "}
              {new Date(invitation._creationTime).toLocaleDateString()}
            </p>
          </div>
          <Button
            onClick={() => handleCancelInvitation(invitation._id)}
            size="sm"
            variant="ghost"
          >
            Cancel
          </Button>
        </div>
      ))}
    </div>
  );
}
