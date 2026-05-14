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
import { AgentIdentity } from "@/features/autopilot/components/agent-identity";
import { cn } from "@/lib/utils";

export type AssignedAgent =
  | "pm"
  | "cto"
  | "growth"
  | "orchestrator"
  | "system"
  | "support"
  | "sales"
  | "ceo"
  | "validator";

const AGENT_OPTIONS: readonly AssignedAgent[] = [
  "pm",
  "cto",
  "growth",
  "orchestrator",
  "support",
  "sales",
  "ceo",
  "validator",
  "system",
] as const;

const AGENT_LABELS: Record<AssignedAgent, string> = {
  pm: "PM",
  cto: "CTO",
  growth: "Growth",
  orchestrator: "Orchestrator",
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
  assignedAgent,
}: {
  assignedMember: Member | undefined;
  assignedAgent: string | undefined;
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
  if (assignedAgent) {
    return <AgentIdentity agent={assignedAgent} />;
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
  assignedAgent,
  assigneeUserId,
  disabled,
}: {
  workItemId: Id<"autopilotWorkItems">;
  organizationId: Id<"organizations">;
  assignedAgent: string | undefined;
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

  const handleSelectAgent = async (
    event: React.MouseEvent<HTMLButtonElement>,
    agent: AssignedAgent
  ) => {
    event.stopPropagation();
    setOpen(false);
    if (agent === assignedAgent) {
      return;
    }
    try {
      await assignWorkItem({ workItemId, assignedAgent: agent });
    } catch {
      toast.error("Failed to assign agent");
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

  const handleClearAgent = async (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    setOpen(false);
    try {
      await assignWorkItem({ workItemId, clearAssignedAgent: true });
    } catch {
      toast.error("Failed to clear agent");
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
          assignedAgent={assignedAgent}
          assignedMember={assignedMember}
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-64 p-0"
        onClick={(event) => event.stopPropagation()}
      >
        <Tabs className="gap-0" defaultValue="agent">
          <TabsList className="m-2" variant="default">
            <TabsTrigger value="agent">Agent</TabsTrigger>
            <TabsTrigger value="user">User</TabsTrigger>
          </TabsList>
          <TabsContent className="max-h-64 overflow-y-auto p-1" value="agent">
            {assignedAgent ? (
              <button
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-muted-foreground text-xs transition-colors hover:bg-muted"
                onClick={handleClearAgent}
                type="button"
              >
                <IconX className="size-3.5" />
                Clear agent assignment
              </button>
            ) : null}
            {AGENT_OPTIONS.map((agent) => {
              const isActive = agent === assignedAgent;
              return (
                <button
                  aria-pressed={isActive}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors",
                    "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                    isActive && "bg-muted/60"
                  )}
                  key={agent}
                  onClick={(event) => handleSelectAgent(event, agent)}
                  type="button"
                >
                  <AgentIdentity agent={agent} showLabel={false} />
                  <span className="flex-1">{AGENT_LABELS[agent]}</span>
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
