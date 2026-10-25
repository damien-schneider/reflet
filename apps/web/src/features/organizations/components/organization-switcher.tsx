import { Button } from "@ctrl-ui/react/ui/button";
import {
  Dialog,
  DialogBody,
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
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import { Field, FieldError, FieldLabel } from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@ctrl-ui/react/ui/sidebar";
import { CaretUpDown, Check, Plus } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { useRememberOrganization } from "@/features/organizations/hooks/use-active-organization";
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
  const rememberOrganization = useRememberOrganization();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
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

  const handleDialogOpenChange = (open: boolean) => {
    setShowCreateDialog(open);
    if (!open) {
      setNewOrgName("");
      setCreateError(null);
    }
  };

  const handleCreateOrg = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCreating || !rememberOrganization) {
      return;
    }
    const name = newOrgName.trim();
    if (!name) {
      setCreateError("Enter an organization name");
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    try {
      const organization = await createOrg({ name });
      rememberOrganization(organization.id);
      handleDialogOpenChange(false);
      router.push(`/dashboard/${organization.slug}`);
    } catch (error) {
      setCreateError(
        error instanceof Error
          ? error.message
          : "Unable to create the organization. Try again."
      );
    }
    setIsCreating(false);
  };

  if (!organizations) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton disabled>
            <OrgAvatar org={null} size="sm" />
            <span>Loading…</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const currentOrgName = currentOrg?.name ?? "Select organization";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                aria-label={`Switch organization. Current: ${currentOrgName}`}
                tooltip={currentOrgName}
              />
            }
          >
            <OrgAvatar
              className="group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:bg-brand group-data-[collapsible=icon]:text-brand-foreground group-data-[collapsible=icon]:text-heading-4"
              org={currentOrg}
              size="sm"
            />
            <span title={currentOrgName}>{currentOrgName}</span>
            <CaretUpDown aria-hidden className="ms-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-50">
            {organizations.map((org) =>
              org ? (
                <DropdownMenuItem
                  className="flex items-center justify-between"
                  key={org._id}
                  render={(props) => (
                    <Link
                      aria-current={
                        org.slug === currentOrgSlug ? "page" : undefined
                      }
                      href={`/dashboard/${org.slug}`}
                      {...props}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <OrgAvatar org={org} size="sm" />
                        <span className="truncate" title={org.name}>
                          {org.name}
                        </span>
                      </span>
                      {org.slug === currentOrgSlug && (
                        <Check aria-hidden className="size-4 shrink-0" />
                      )}
                    </Link>
                  )}
                />
              ) : null
            )}
            {organizations.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={() => setShowCreateDialog(true)}>
              <Plus aria-hidden className="size-4" />
              Create organization
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog onOpenChange={handleDialogOpenChange} open={showCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create organization</DialogTitle>
              <DialogDescription>
                An organization holds your boards, changelog and team.
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              <form
                id="create-organization-form"
                noValidate
                onSubmit={handleCreateOrg}
              >
                <Field invalid={Boolean(createError)}>
                  <FieldLabel htmlFor="new-organization-name">
                    Organization name
                  </FieldLabel>
                  <Input
                    autoComplete="organization"
                    disabled={isCreating}
                    id="new-organization-name"
                    onChange={(e) => {
                      setNewOrgName(e.target.value);
                      setCreateError(null);
                    }}
                    placeholder="My Company"
                    value={newOrgName}
                  />
                  <FieldError match={Boolean(createError)}>
                    {createError}
                  </FieldError>
                </Field>
              </form>
            </DialogBody>
            <DialogFooter>
              <Button
                onClick={() => handleDialogOpenChange(false)}
                type="button"
                variant="surface"
              >
                Cancel
              </Button>
              <Button
                disabled={isCreating || !rememberOrganization}
                form="create-organization-form"
                tone="primary"
                type="submit"
                variant="solid"
              >
                {isCreating ? "Creating…" : "Create organization"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
