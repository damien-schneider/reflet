import { SignOut, User } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListLabel,
  DropdownListSeparator,
  DropdownListTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar/context";
import { authClient } from "@/lib/auth-client";

export default function UserList() {
  const user = useQuery(api.auth.getCurrentUser);
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <DropdownList>
      <DropdownListTrigger
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
      </DropdownListTrigger>
      <DropdownListContent className="w-56 bg-card">
        <DropdownListLabel>My Account</DropdownListLabel>
        <DropdownListSeparator />
        <DropdownListItem className="text-muted-foreground">
          {user?.email}
        </DropdownListItem>
        <DropdownListSeparator />
        <DropdownListItem
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
          <SignOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownListItem>
      </DropdownListContent>
    </DropdownList>
  );
}
