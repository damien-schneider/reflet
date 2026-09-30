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
import { Field, FieldError, FieldLabel } from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { CaretUpDown, Check, Plus } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { OrgAvatar } from "./org-avatar";

interface OrganizationSwitcherProps {
  currentOrgSlug?: string;
}

const TRIGGER_CLASS =
  "w-full justify-between group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0";

export function OrganizationSwitcher({
  currentOrgSlug,
}: OrganizationSwitcherProps) {
  const router = useRouter();
  const organizations = useQuery(api.organizations.queries.list);
  const createOrg = useMutation(api.organizations.mutations.create);
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
    const name = newOrgName.trim();
    if (!name) {
      setCreateError("Enter an organization name");
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    try {
      await createOrg({ name });
      handleDialogOpenChange(false);
      router.push("/dashboard");
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
      <Button className={TRIGGER_CLASS} disabled variant="surface">
        <OrgAvatar org={null} size="sm" />
        <span className="group-data-[collapsible=icon]:hidden">Loading…</span>
      </Button>
    );
  }

  const currentOrgName = currentOrg?.name ?? "Select organization";

  return (
    <>
      <DropdownMenu>
        <Button
          aria-label={`Switch organization. Current: ${currentOrgName}`}
          className={TRIGGER_CLASS}
          render={<Menu.Trigger />}
          size="md"
          variant="surface"
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 group-data-[collapsible=icon]:flex-none">
            <OrgAvatar org={currentOrg} size="sm" />
            <span
              className="truncate group-data-[collapsible=icon]:hidden"
              title={currentOrgName}
            >
              {currentOrgName}
            </span>
          </span>
          <CaretUpDown
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden"
          />
        </Button>
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
          <DialogFooter>
            <Button
              onClick={() => handleDialogOpenChange(false)}
              type="button"
              variant="surface"
            >
              Cancel
            </Button>
            <Button
              disabled={isCreating}
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
    </>
  );
}
