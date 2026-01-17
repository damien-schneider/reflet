import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Shield, User } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InviteMemberDialogProps {
  organizationId: Id<"organizations">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteMemberDialog({
  organizationId,
  open,
  onOpenChange,
}: InviteMemberDialogProps) {
  const inviteMember = useMutation(api.invitations.create);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await inviteMember({
        organizationId,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      });
      onOpenChange(false);
      setInviteEmail("");
      setInviteRole("member");
    } catch (error) {
      console.error("Failed to invite member:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
          <DialogDescription>
            Invite a new member to your organization.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
              type="email"
              value={inviteEmail}
            />
          </div>
          <div className="grid gap-2">
            <Label>Role</Label>
            <Select
              onValueChange={(v) => setInviteRole(v as "admin" | "member")}
              value={inviteRole}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Member
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Admin
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Admins can manage boards, tags, and members. Members can only view
              and submit feedback.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={isSubmitting} onClick={handleInvite}>
            {isSubmitting ? "Sending..." : "Send invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
