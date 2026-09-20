import { Menu } from "@base-ui/react/menu";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ctrl-ui/react/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@ctrl-ui/react/ui/dropdown-menu";
import { Input } from "@ctrl-ui/react/ui/input";
import { toast } from "@ctrl-ui/react/ui/toast";
import { CaretUpDown, Check, Plus } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { OrgAvatar } from "./org-avatar";

interface OrganizationSwitcherProps {
  currentOrgSlug?: string;
}

export function OrganizationSwitcher({
  currentOrgSlug,
}: OrganizationSwitcherProps) {
  const router = useRouter();
  const organizations = useQuery(api.organizations.queries.list);
  const createOrg = useMutation(api.organizations.mutations.create);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const currentOrg = organizations?.find((org) => org?.slug === currentOrgSlug);

  useEffect(() => {
    if (organizations) {
      for (const org of organizations) {
        if (org?.slug && org.slug !== currentOrgSlug) {
          router.prefetch(`/dashboard/${org.slug}`);
        }
      }
    }
  }, [organizations, currentOrgSlug, router]);

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
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create organization";
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  if (!organizations) {
    return (
      <Button
        className="w-full justify-between group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
        disabled
        variant="surface"
      >
        <OrgAvatar org={null} size="sm" />
        <span className="group-data-[collapsible=icon]:hidden">Loading...</span>
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <Button
          className="w-full justify-between group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
          render={<Menu.Trigger />}
          size="md"
          variant="surface"
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 group-data-[collapsible=icon]:flex-none">
            <OrgAvatar org={currentOrg} size="sm" />
            <span className="truncate group-data-[collapsible=icon]:hidden">
              {currentOrg?.name || "Select organization"}
            </span>
          </span>
          <CaretUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 group-data-[collapsible=icon]:hidden" />
        </Button>
        <DropdownMenuContent align="start" className="w-50">
          {organizations.map((org) =>
            org ? (
              <DropdownMenuItem
                className="flex items-center justify-between"
                key={org._id}
                render={(props) => (
                  <Link href={`/dashboard/${org.slug}`} {...props}>
                    <span className="flex items-center gap-2 truncate">
                      <OrgAvatar org={org} size="sm" />
                      <span className="truncate">{org.name}</span>
                    </span>
                    {org.slug === currentOrgSlug && (
                      <Check className="h-4 w-4 shrink-0" />
                    )}
                  </Link>
                )}
              />
            ) : null
          )}
          {organizations.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem onClick={() => setShowCreateDialog(true)}>
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
              variant="surface"
            >
              Cancel
            </Button>
            <Button
              disabled={isCreating}
              onClick={handleCreateOrg}
              tone="primary"
              variant="solid"
            >
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
