import { api } from "@reflet-v2/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";

export default function UserMenu() {
  const user = useQuery(api.auth.getCurrentUser);
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            className="w-full justify-start group-data-[collapsible=icon]:p-2"
            variant="outline"
          />
        }
      >
        <span className="flex items-center gap-2 truncate">
          <User className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span className="truncate">{user?.name}</span>}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-card">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-muted-foreground">
          {user?.email}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  location.reload();
                },
              },
            });
          }}
          variant="destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
