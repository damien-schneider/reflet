import { api } from "@reflet-v2/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
      // Navigate to dashboard - list will refresh with new org
      router.push("/dashboard");
    } catch {
      // Error handling - could show toast here
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
          <Building2 className="h-4 w-4" />
          {!isCollapsed && <span>Loading...</span>}
        </span>
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 group-data-[collapsible=icon]:p-2">
          <span className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 shrink-0" />
            {!isCollapsed && (
              <span className="truncate">
                {currentOrg?.name || "Select organization"}
              </span>
            )}
          </span>
          {!isCollapsed && (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-50">
          {organizations.map((org) =>
            org ? (
              <DropdownMenuItem
                className="flex items-center justify-between"
                key={org._id}
                onSelect={() => handleSelectOrg(org.slug)}
              >
                <span className="truncate">{org.name}</span>
                {org.slug === currentOrgSlug && (
                  <Check className="h-4 w-4 shrink-0" />
                )}
              </DropdownMenuItem>
            ) : null
          )}
          {organizations.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem onSelect={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
