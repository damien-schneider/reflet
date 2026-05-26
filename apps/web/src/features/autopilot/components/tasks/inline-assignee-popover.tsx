"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { IconUserCircle, IconX } from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleSkillIdentity } from "@/features/autopilot/components/role-skill-identity";
import { cn } from "@/lib/utils";

export type AssignedRole =
  | "pm"
  | "cto"
  | "growth"
  | "system"
  | "support"
  | "sales"
  | "ceo"
  | "validator";

const ROLE_OPTIONS: readonly AssignedRole[] = [
  "pm",
  "cto",
  "growth",
  "support",
  "sales",
  "ceo",
  "validator",
  "system",
] as const;

const ROLE_SKILL_LABELS: Record<AssignedRole, string> = {
  pm: "PM",
  cto: "CTO",
  growth: "Growth",
  support: "Support",
  sales: "Sales",
  ceo: "CEO",
  validator: "Validator",
  system: "System",
};

interface Member {
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  userId: string;
}

function memberLabel(member: Member): string {
  return (
    member.user?.name?.trim() ?? member.user?.email?.trim() ?? "Unknown user"
  );
}

function memberInitial(member: Member): string {
  const label = memberLabel(member);
  return label.charAt(0).toUpperCase();
}

function MemberAvatar({ member }: { member: Member }) {
  return (
    <Avatar className="size-5">
      {member.user?.image ? (
        <AvatarImage alt={memberLabel(member)} src={member.user.image} />
      ) : null}
      <AvatarFallback className="text-[10px]">
        {memberInitial(member)}
      </AvatarFallback>
    </Avatar>
  );
}

function AssigneeTriggerLabel({
  assignedMember,
  assignedRole,
}: {
  assignedMember: Member | undefined;
  assignedRole: string | undefined;
}) {
  if (assignedMember) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <MemberAvatar member={assignedMember} />
        <span className="text-muted-foreground">
          {memberLabel(assignedMember)}
        </span>
      </span>
    );
  }
  if (assignedRole) {
    return <RoleSkillIdentity role={assignedRole} />;
  }
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <IconUserCircle className="size-4" />
      Unassigned
    </span>
  );
}

function UserList({
  members,
  assigneeUserId,
  onSelect,
}: {
  members: Member[] | undefined;
  assigneeUserId: string | undefined;
  onSelect: (
    event: React.MouseEvent<HTMLButtonElement>,
    userId: string
  ) => void;
}) {
  if (members === undefined) {
    return (
      <div className="px-2 py-3 text-muted-foreground text-xs">
        Loading members…
      </div>
    );
  }
  if (members.length === 0) {
    return (
      <div className="px-2 py-3 text-muted-foreground text-xs">
        No members in this organization.
      </div>
    );
  }
  return (
    <>
      {members.map((member) => {
        const isActive = member.userId === assigneeUserId;
        return (
          <button
            aria-pressed={isActive}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors",
              "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
              isActive && "bg-muted/60"
            )}
            key={member.userId}
            onClick={(event) => onSelect(event, member.userId)}
            type="button"
          >
            <MemberAvatar member={member} />
            <span className="flex-1 truncate">{memberLabel(member)}</span>
          </button>
        );
      })}
    </>
  );
}

export function InlineAssigneePopover({
  workItemId,
  organizationId,
  assignedRole,
  assigneeUserId,
  disabled,
}: {
  workItemId: Id<"autopilotWorkItems">;
  organizationId: Id<"organizations">;
  assignedRole: string | undefined;
  assigneeUserId: string | undefined;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const assignWorkItem = useMutation(
    api.autopilot.mutations.work.assignWorkItem
  );
  const members = useQuery(
    api.organizations.members.list,
    open ? { organizationId } : "skip"
  );

  const assignedMember = members?.find(
    (member) => member.userId === assigneeUserId
  );

  const handleSelectRole = async (
    event: React.MouseEvent<HTMLButtonElement>,
    role: AssignedRole
  ) => {
    event.stopPropagation();
    setOpen(false);
    if (role === assignedRole) {
      return;
    }
    try {
      await assignWorkItem({ workItemId, assignedRole: role });
    } catch {
      toast.error("Failed to assign role skill");
    }
  };

  const handleSelectUser = async (
    event: React.MouseEvent<HTMLButtonElement>,
    userId: string
  ) => {
    event.stopPropagation();
    setOpen(false);
    if (userId === assigneeUserId) {
      return;
    }
    try {
      await assignWorkItem({ workItemId, assigneeUserId: userId });
    } catch {
      toast.error("Failed to assign user");
    }
  };

  const handleClearRole = async (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    setOpen(false);
    try {
      await assignWorkItem({ workItemId, clearAssignedRole: true });
    } catch {
      toast.error("Failed to clear role skill");
    }
  };

  const handleClearUser = async (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    setOpen(false);
    try {
      await assignWorkItem({ workItemId, clearAssigneeUser: true });
    } catch {
      toast.error("Failed to clear assignee");
    }
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <button
            aria-label="Change assignee"
            className="inline-flex items-center gap-1.5 rounded-sm px-1 py-0.5 text-xs transition-colors hover:bg-muted"
            disabled={disabled}
            onClick={(event) => event.stopPropagation()}
            type="button"
          />
        }
      >
        <AssigneeTriggerLabel
          assignedMember={assignedMember}
          assignedRole={assignedRole}
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-64 p-0"
        onClick={(event) => event.stopPropagation()}
      >
        <Tabs className="gap-0" defaultValue="role">
          <TabsList className="m-2" variant="default">
            <TabsTrigger value="role">Role Skill</TabsTrigger>
            <TabsTrigger value="user">User</TabsTrigger>
          </TabsList>
          <TabsContent className="max-h-64 overflow-y-auto p-1" value="role">
            {assignedRole ? (
              <button
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-muted-foreground text-xs transition-colors hover:bg-muted"
                onClick={handleClearRole}
                type="button"
              >
                <IconX className="size-3.5" />
                Clear role-skill assignment
              </button>
            ) : null}
            {ROLE_OPTIONS.map((role) => {
              const isActive = role === assignedRole;
              return (
                <button
                  aria-pressed={isActive}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors",
                    "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                    isActive && "bg-muted/60"
                  )}
                  key={role}
                  onClick={(event) => handleSelectRole(event, role)}
                  type="button"
                >
                  <RoleSkillIdentity role={role} showLabel={false} />
                  <span className="flex-1">{ROLE_SKILL_LABELS[role]}</span>
                </button>
              );
            })}
          </TabsContent>
          <TabsContent className="max-h-64 overflow-y-auto p-1" value="user">
            {assigneeUserId ? (
              <button
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-muted-foreground text-xs transition-colors hover:bg-muted"
                onClick={handleClearUser}
                type="button"
              >
                <IconX className="size-3.5" />
                Clear user assignment
              </button>
            ) : null}
            <UserList
              assigneeUserId={assigneeUserId}
              members={members}
              onSelect={handleSelectUser}
            />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
