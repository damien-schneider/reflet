import { Check, Copy, Shield, User } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useEffect, useReducer, useRef } from "react";
import { toast } from "sonner";
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
import { capture } from "@/lib/analytics";

interface InviteMemberDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  organizationId: Id<"organizations">;
}

type DialogState = "form" | "success";
type InviteRole = "admin" | "member";

interface InviteFormState {
  copied: boolean;
  dialogState: DialogState;
  email: string;
  invitationToken: string | null;
  isSubmitting: boolean;
  role: InviteRole;
}

type InviteFormAction =
  | { type: "copyReset" }
  | { type: "copySucceeded" }
  | { email: string; type: "emailChanged" }
  | { role: InviteRole; type: "roleChanged" }
  | { token: string; type: "submitSucceeded" }
  | { type: "reset" }
  | { type: "submitFinished" }
  | { type: "submitStarted" };

const initialInviteFormState: InviteFormState = {
  copied: false,
  dialogState: "form",
  email: "",
  invitationToken: null,
  isSubmitting: false,
  role: "member",
};

const inviteFormReducer = (
  state: InviteFormState,
  action: InviteFormAction
): InviteFormState => {
  switch (action.type) {
    case "copyReset":
      return { ...state, copied: false };
    case "copySucceeded":
      return { ...state, copied: true };
    case "emailChanged":
      return { ...state, email: action.email };
    case "reset":
      return initialInviteFormState;
    case "roleChanged":
      return { ...state, role: action.role };
    case "submitFinished":
      return { ...state, isSubmitting: false };
    case "submitStarted":
      return { ...state, isSubmitting: true };
    case "submitSucceeded":
      return {
        ...state,
        copied: false,
        dialogState: "success",
        invitationToken: action.token,
      };
    default: {
      const exhaustiveAction: never = action;
      return exhaustiveAction;
    }
  }
};

const parseInviteRole = (value: string | null): InviteRole =>
  value === "admin" ? "admin" : "member";

export function InviteMemberDialog({
  organizationId,
  open,
  onOpenChange,
}: InviteMemberDialogProps) {
  const inviteMember = useMutation(api.organizations.invitations.create);
  const [state, dispatch] = useReducer(
    inviteFormReducer,
    initialInviteFormState
  );
  const copyResetTimeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const { copied, dialogState, email, invitationToken, isSubmitting, role } =
    state;

  // Reset state when dialog closes
  useEffect(
    function resetStateOnDialogClose() {
      if (!open) {
        dispatch({ type: "reset" });
      }
    },
    [open]
  );

  useEffect(function clearCopyResetTimeoutOnUnmount() {
    return () => {
      if (copyResetTimeoutIdRef.current !== null) {
        clearTimeout(copyResetTimeoutIdRef.current);
      }
    };
  }, []);

  const sendInvitation = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return;
    }

    dispatch({ type: "submitStarted" });
    try {
      const result = await inviteMember({
        organizationId,
        email: normalizedEmail,
        role,
      });
      capture("member_invited", { role });
      dispatch({ token: result.token, type: "submitSucceeded" });
    } catch (error) {
      console.error("Failed to invite member:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to invite member"
      );
    } finally {
      dispatch({ type: "submitFinished" });
    }
  };

  const copyInvitationLink = async () => {
    if (!invitationToken) {
      return;
    }

    const inviteUrl = `${window.location.origin}/invite/${invitationToken}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      dispatch({ type: "copySucceeded" });
      if (copyResetTimeoutIdRef.current !== null) {
        clearTimeout(copyResetTimeoutIdRef.current);
      }
      copyResetTimeoutIdRef.current = setTimeout(() => {
        dispatch({ type: "copyReset" });
        copyResetTimeoutIdRef.current = null;
      }, 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  const closeInvitation = () => {
    onOpenChange(false);
  };

  if (dialogState === "success") {
    const inviteUrl = `${typeof window === "undefined" ? "" : window.location.origin}/invite/${invitationToken}`;

    return (
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitation sent!</DialogTitle>
            <DialogDescription>
              An invitation has been sent to {email}. You can also share the
              link below.
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
                <Button
                  aria-label={
                    copied ? "Invitation link copied" : "Copy invitation link"
                  }
                  onClick={copyInvitationLink}
                  size="icon"
                  variant="outline"
                >
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                {copied ? "Copied!" : "Copy link to share with your colleague"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={closeInvitation}>Close invitation</Button>
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
              onChange={(event) =>
                dispatch({
                  email: event.target.value,
                  type: "emailChanged",
                })
              }
              placeholder="colleague@example.com"
              type="email"
              value={email}
            />
          </div>
          <div className="grid gap-2">
            <Label>Role</Label>
            <Select
              onValueChange={(value) =>
                dispatch({
                  role: parseInviteRole(value),
                  type: "roleChanged",
                })
              }
              value={role}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">
                  <div className="flex items-center gap-2">
                    <User className="size-4" />
                    Member
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Shield className="size-4" />
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
          <Button disabled={isSubmitting} onClick={sendInvitation}>
            {isSubmitting ? "Sending..." : "Send invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
