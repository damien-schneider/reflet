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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROLE_ICONS = {
  owner: Crown,
  admin: Shield,
  member: User,
};

const ROLE_LABELS = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

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
  members: MemberInfo[] | undefined;
  isOwner: boolean;
  onRemoveMember: (id: Id<"organizationMembers">, name: string) => void;
}

export function MemberList({
  members,
  isOwner,
  onRemoveMember,
}: MemberListProps) {
  const updateRole = useMutation(api.members.updateRole);

  const handleUpdateRole = async (
    memberId: Id<"organizationMembers">,
    role: "admin" | "member"
  ) => {
    try {
      await updateRole({
        memberId,
        role,
      });
    } catch (error) {
      console.error("Failed to update role:", error);
    }
  };

  return (
    <div className="divide-y">
      {members?.map((member) => {
        const RoleIcon = ROLE_ICONS[member.role as keyof typeof ROLE_ICONS];
        const name = member.user?.name || member.user?.email || "Unknown";
        const initials = name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        return (
          <div
            className="flex items-center justify-between py-4"
            key={member._id}
          >
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={member.user?.image ?? undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{name}</p>
                <p className="text-muted-foreground text-sm">
                  {member.user?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="gap-1" variant="outline">
                <RoleIcon className="h-3 w-3" />
                {ROLE_LABELS[member.role as keyof typeof ROLE_LABELS]}
              </Badge>
              {isOwner && member.role !== "owner" && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={(props: React.ComponentProps<"button">) => (
                      <Button {...props} size="icon" variant="ghost">
                        <DotsThreeVertical className="h-4 w-4" />
                      </Button>
                    )}
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        handleUpdateRole(
                          member._id,
                          member.role === "admin" ? "member" : "admin"
                        )
                      }
                    >
                      {member.role === "admin"
                        ? "Demote to member"
                        : "Promote to admin"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() =>
                        onRemoveMember(
                          member._id,
                          member.user?.name || member.user?.email || "Unknown"
                        )
                      }
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
