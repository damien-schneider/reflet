import { Check, Copy, Shield, User } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InviteMemberDialogProps {
  organizationId: Id<"organizations">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DialogState = "form" | "success";

export function InviteMemberDialog({
  organizationId,
  open,
  onOpenChange,
}: InviteMemberDialogProps) {
  const inviteMember = useMutation(api.invitations.create);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>("form");
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setInviteEmail("");
      setInviteRole("member");
      setIsSubmitting(false);
      setDialogState("form");
      setInvitationToken(null);
      setCopied(false);
    }
  }, [open]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await inviteMember({
        organizationId,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      });
      setInvitationToken(result.token);
      setDialogState("success");
    } catch (error) {
      console.error("Failed to invite member:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!invitationToken) {
      return;
    }

    const inviteUrl = `${window.location.origin}/invite/${invitationToken}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  if (dialogState === "success") {
    const inviteUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${invitationToken}`;

    return (
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitation sent!</DialogTitle>
            <DialogDescription>
              An invitation has been sent to {inviteEmail}. You can also share
              the link below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="invite-link">Invitation link</Label>
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  id="invite-link"
                  readOnly
                  value={inviteUrl}
                />
                <Tooltip>
                  <TooltipTrigger
                    aria-label="Copy invitation link"
                    className={buttonVariants({ variant: "outline", size: "icon" })}
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </TooltipTrigger>
                  <TooltipContent>Copy invitation link</TooltipContent>
                </Tooltip>
              </div>
              <p className="text-muted-foreground text-xs">
                {copied ? "Copied!" : "Copy link to share with your colleague"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

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
