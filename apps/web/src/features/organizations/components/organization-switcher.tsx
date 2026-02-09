import { CaretUpDown, Check, Plus } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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

function OrgIcon({
  org,
}: {
  org?: { name: string; logo?: string | null } | null;
}) {
  if (org?.logo) {
    return (
      <Image
        alt={org.name}
        className="h-4 w-4 shrink-0 rounded object-contain"
        height={16}
        src={org.logo}
        width={16}
      />
    );
  }

  if (org) {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-olive-100 font-display font-medium text-[10px] text-olive-700 dark:bg-olive-800/40 dark:text-olive-300">
        {org.name.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-olive-100 dark:bg-olive-800/40" />
  );
}

interface OrganizationSwitcherProps {
  currentOrgSlug?: string;
}

export function OrganizationSwitcher({
  currentOrgSlug,
}: OrganizationSwitcherProps) {
  const router = useRouter();
  const organizations = useQuery(api.organizations.list);
  const createOrg = useMutation(api.organizations.create);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const currentOrg = organizations?.find((org) => org?.slug === currentOrgSlug);

  // Prefetch organization routes for instant switching
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
        variant="outline"
      >
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-olive-100 dark:bg-olive-800/40" />
        <span className="group-data-[collapsible=icon]:hidden">Loading...</span>
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
              className="w-full justify-between group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
              size="lg"
              variant="outline"
            />
          }
        >
          <span className="flex items-center gap-2 truncate">
            <OrgIcon org={currentOrg} />
            <span className="truncate group-data-[collapsible=icon]:hidden">
              {currentOrg?.name || "Select organization"}
            </span>
          </span>
          <CaretUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 group-data-[collapsible=icon]:hidden" />
        </DropdownListTrigger>
        <DropdownListContent align="start" className="w-50">
          {organizations.map((org) =>
            org ? (
              <DropdownListItem
                className="flex items-center justify-between"
                key={org._id}
                render={(props) => (
                  <Link href={`/dashboard/${org.slug}`} {...props}>
                    <span className="flex items-center gap-2 truncate">
                      <OrgIcon org={org} />
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
          {organizations.length > 0 && <DropdownListSeparator />}
          <DropdownListItem onClick={() => setShowCreateDialog(true)}>
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
