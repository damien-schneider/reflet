import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { toast } from "@ctrl-ui/react/ui/toast";
import {
  Crown,
  DotsThreeVertical,
  Shield,
  Trash,
  User,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";

import { UserAvatar } from "@/features/account/components/user-avatar";

const ROLE_CONFIG = {
  admin: { icon: Shield, label: "Admin" },
  member: { icon: User, label: "Member" },
  owner: { icon: Crown, label: "Owner" },
} as const;

const SKELETON_ROWS = ["first", "second"];

interface MemberInfo {
  _id: Id<"organizationMembers">;
  role: "owner" | "admin" | "member";
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
}

interface MemberListProps {
  isOwner: boolean;
  members: MemberInfo[] | undefined;
  onRemoveMember: (id: Id<"organizationMembers">, name: string) => void;
}

export function MemberList({
  members,
  isOwner,
  onRemoveMember,
}: MemberListProps) {
  if (members === undefined) {
    return (
      <ul aria-busy="true" className="divide-y">
        {SKELETON_ROWS.map((id) => (
          <li className="flex items-center gap-3 py-3" key={id}>
            <Skeleton className="size-8 rounded-full" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="divide-y">
      {members.map((member) => (
        <MemberRow
          canManage={isOwner && member.role !== "owner"}
          key={member._id}
          member={member}
          onRemoveMember={onRemoveMember}
        />
      ))}
    </ul>
  );
}

function MemberRow({
  canManage,
  member,
  onRemoveMember,
}: {
  canManage: boolean;
  member: MemberInfo;
  onRemoveMember: MemberListProps["onRemoveMember"];
}) {
  const role = ROLE_CONFIG[member.role];
  const RoleIcon = role.icon;
  const name = member.user?.name || member.user?.email || "Unknown";

  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar user={member.user} />
        <div className="flex min-w-0 flex-col">
          <p className="truncate font-medium text-label">{name}</p>
          {member.user?.email ? (
            <p className="truncate text-caption text-muted-foreground">
              {member.user.email}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge size="sm" variant="outline">
          <RoleIcon aria-hidden />
          {role.label}
        </Badge>
        {canManage ? (
          <MemberActions
            member={member}
            name={name}
            onRemoveMember={onRemoveMember}
          />
        ) : null}
      </div>
    </li>
  );
}

function MemberActions({
  member,
  name,
  onRemoveMember,
}: {
  member: MemberInfo;
  name: string;
  onRemoveMember: MemberListProps["onRemoveMember"];
}) {
  const updateRole = useMutation(api.organizations.members.updateRole);
  const nextRole = member.role === "admin" ? "member" : "admin";

  const handleUpdateRole = async () => {
    try {
      await updateRole({ memberId: member._id, role: nextRole });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn’t change the role"
      );
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={(props: React.ComponentProps<"button">) => (
          <Button
            {...props}
            aria-label={`Actions for ${name}`}
            iconOnly
            size="sm"
            variant="ghost"
          >
            <DotsThreeVertical aria-hidden />
          </Button>
        )}
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleUpdateRole}>
          {nextRole === "admin" ? "Promote to admin" : "Demote to member"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="menu-item-danger"
          onClick={() => onRemoveMember(member._id, name)}
        >
          <Trash aria-hidden />
          Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
