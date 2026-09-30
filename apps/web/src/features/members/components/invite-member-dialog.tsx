import { Button } from "@ctrl-ui/react/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ctrl-ui/react/ui/dialog";
import { Field, FieldError, FieldLabel } from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { Radio, RadioGroup } from "@ctrl-ui/react/ui/radio-group";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Shield, User } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { capture } from "@/lib/analytics";

type InviteRole = "admin" | "member";

const ROLE_OPTIONS = [
  {
    description: "Views boards and submits feedback.",
    icon: User,
    label: "Member",
    value: "member",
  },
  {
    description: "Also manages boards, tags and members.",
    icon: Shield,
    label: "Admin",
    value: "admin",
  },
] as const;

interface InviteMemberDialogProps {
  canInviteAdmins: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  organizationId: Id<"organizations">;
}

export function InviteMemberDialog({
  canInviteAdmins,
  organizationId,
  open,
  onOpenChange,
}: InviteMemberDialogProps) {
  const [sentInvite, setSentInvite] = useState<{
    email: string;
    token: string;
  } | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setSentInvite(null);
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        {sentInvite ? (
          <InviteSuccess
            email={sentInvite.email}
            onDone={() => onOpenChange(false)}
            token={sentInvite.token}
          />
        ) : (
          <InviteForm
            canInviteAdmins={canInviteAdmins}
            onCancel={() => onOpenChange(false)}
            onSent={setSentInvite}
            organizationId={organizationId}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function InviteForm({
  canInviteAdmins,
  onCancel,
  onSent,
  organizationId,
}: {
  canInviteAdmins: boolean;
  onCancel: () => void;
  onSent: (invite: { email: string; token: string }) => void;
  organizationId: Id<"organizations">;
}) {
  const inviteMember = useMutation(api.organizations.invitations.create);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("member");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Enter an email address");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await inviteMember({
        email: normalizedEmail,
        organizationId,
        role,
      });
      capture("member_invited", { role });
      onSent({ email: normalizedEmail, token: result.token });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t send the invite");
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Invite member</DialogTitle>
        <DialogDescription>
          They’ll get an email with a link to join your organization.
        </DialogDescription>
      </DialogHeader>
      <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        <Field>
          <FieldLabel htmlFor="email">Email address</FieldLabel>
          <Input
            aria-describedby="invite-email-error"
            aria-invalid={error ? true : undefined}
            autoComplete="off"
            id="email"
            onChange={(event) => {
              setEmail(event.target.value);
              setError(null);
            }}
            placeholder="colleague@example.com"
            spellCheck={false}
            type="email"
            value={email}
          />
          <FieldError
            id="invite-email-error"
            match={error !== null}
            role="alert"
          >
            {error}
          </FieldError>
        </Field>
        {canInviteAdmins ? <RoleField onChange={setRole} value={role} /> : null}
        <DialogFooter>
          <Button onClick={onCancel} type="button" variant="surface">
            Cancel
          </Button>
          <Button
            disabled={isSubmitting}
            tone="primary"
            type="submit"
            variant="solid"
          >
            {isSubmitting ? (
              <Spinner aria-hidden data-icon="inline-start" size="xs" />
            ) : null}
            {isSubmitting ? "Sending…" : "Send invitation"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

function RoleField({
  onChange,
  value,
}: {
  onChange: (role: InviteRole) => void;
  value: InviteRole;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-label" id="invite-role-label">
        Role
      </span>
      <RadioGroup<InviteRole>
        aria-labelledby="invite-role-label"
        className="grid gap-2 sm:grid-cols-2"
        onValueChange={onChange}
        value={value}
      >
        {ROLE_OPTIONS.map((option) => (
          <label
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3"
            htmlFor={`invite-role-${option.value}`}
            key={option.value}
          >
            <Radio id={`invite-role-${option.value}`} value={option.value} />
            <span className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 font-medium text-label">
                <option.icon aria-hidden className="size-4" />
                {option.label}
              </span>
              <span className="text-caption text-muted-foreground">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}

function InviteSuccess({
  email,
  onDone,
  token,
}: {
  email: string;
  onDone: () => void;
  token: string;
}) {
  const inviteUrl = `${typeof window === "undefined" ? "" : window.location.origin}/invite/${token}`;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Invitation sent</DialogTitle>
        <DialogDescription>
          We emailed {email}. You can also share the link directly.
        </DialogDescription>
      </DialogHeader>
      <Field>
        <FieldLabel htmlFor="invite-link">Invitation link</FieldLabel>
        <div className="flex items-center gap-2">
          <Input
            className="flex-1 font-mono"
            id="invite-link"
            onFocus={(event) => event.target.select()}
            readOnly
            value={inviteUrl}
          />
          <CopyButton label="Copy invitation link" value={inviteUrl} />
        </div>
      </Field>
      <DialogFooter>
        <Button onClick={onDone} tone="primary" variant="solid">
          Done
        </Button>
      </DialogFooter>
    </>
  );
}
