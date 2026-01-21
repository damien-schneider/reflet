import { Buildings, CaretUpDown, Check, Plus } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
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
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListSeparator,
  DropdownListTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSidebar } from "@/components/ui/sidebar";

interface OrganizationSwitcherProps {
  currentOrgSlug?: string;
}

export function OrganizationSwitcher({
  currentOrgSlug,
}: OrganizationSwitcherProps) {
  const router = useRouter();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const organizations = useQuery(api.organizations.list);
  const createOrg = useMutation(api.organizations.create);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const currentOrg = organizations?.find((org) => org?.slug === currentOrgSlug);

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) {
      return;
    }

    setIsCreating(true);
    try {
      await createOrg({ name: newOrgName.trim() });
      setShowCreateDialog(false);
      setNewOrgName("");
      router.push("/dashboard");
    } catch {
      // Error handling - organization creation failed
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectOrg = (orgSlug: string) => {
    router.push(`/dashboard/${orgSlug}`);
  };

  if (!organizations) {
    return (
      <Button
        className="w-full justify-between group-data-[collapsible=icon]:p-2"
        disabled
        variant="outline"
      >
        <span className="flex items-center gap-2">
          <Buildings className="h-4 w-4" />
          {!isCollapsed && <span>Loading...</span>}
        </span>
      </Button>
    );
  }

  return (
    <>
      <DropdownList>
        <DropdownListTrigger
          className="w-full justify-between"
          render={
            <Button
              className="w-full justify-between group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
              size="lg"
              variant="outline"
            />
          }
        >
          <span className="flex items-center gap-2 truncate">
            <Buildings className="h-4 w-4 shrink-0" />
            {!isCollapsed && (
              <span className="truncate group-data-[collapsible=icon]:hidden">
                {currentOrg?.name || "Select organization"}
              </span>
            )}
          </span>
          {!isCollapsed && (
            <CaretUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </DropdownListTrigger>
        <DropdownListContent align="start" className="w-50">
          {organizations.map((org) =>
            org ? (
              <DropdownListItem
                className="flex items-center justify-between"
                key={org._id}
                onSelect={() => handleSelectOrg(org.slug)}
              >
                <span className="truncate">{org.name}</span>
                {org.slug === currentOrgSlug && (
                  <Check className="h-4 w-4 shrink-0" />
                )}
              </DropdownListItem>
            ) : null
          )}
          {organizations.length > 0 && <DropdownListSeparator />}
          <DropdownListItem onSelect={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create organization
          </DropdownListItem>
        </DropdownListContent>
      </DropdownList>

      <Dialog onOpenChange={setShowCreateDialog} open={showCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create organization</DialogTitle>
            <DialogDescription>
              Create a new organization to start collecting feedback.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Organization name</Label>
              <Input
                id="name"
                onChange={(e) => setNewOrgName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateOrg();
                  }
                }}
                placeholder="My Company"
                value={newOrgName}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowCreateDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isCreating} onClick={handleCreateOrg}>
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
