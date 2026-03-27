"use client";

import { Plus } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const URL_PATTERN = /^https?:\/\/.+\..+/;

const isValidUrl = (value: string): boolean => {
  if (!value.trim()) {
    return true;
  }
  return URL_PATTERN.test(value);
};

interface AddCompetitorDialogProps {
  organizationId: Id<"organizations">;
}

export function AddCompetitorDialog({
  organizationId,
}: AddCompetitorDialogProps) {
  const createCompetitor = useMutation(api.intelligence.competitors.create);

  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [changelogUrl, setChangelogUrl] = useState("");
  const [pricingUrl, setPricingUrl] = useState("");
  const [featuresUrl, setFeaturesUrl] = useState("");

  const resetForm = () => {
    setName("");
    setWebsiteUrl("");
    setDescription("");
    setChangelogUrl("");
    setPricingUrl("");
    setFeaturesUrl("");
  };

  const urlFieldsValid =
    isValidUrl(websiteUrl) &&
    isValidUrl(changelogUrl) &&
    isValidUrl(pricingUrl) &&
    isValidUrl(featuresUrl);

  const canSubmit =
    name.trim() !== "" &&
    websiteUrl.trim() !== "" &&
    urlFieldsValid &&
    !isCreating;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!canSubmit) {
      return;
    }

    setIsCreating(true);
    try {
      await createCompetitor({
        organizationId,
        name: name.trim(),
        websiteUrl: websiteUrl.trim(),
        description: description.trim() || undefined,
        changelogUrl: changelogUrl.trim() || undefined,
        pricingUrl: pricingUrl.trim() || undefined,
        featuresUrl: featuresUrl.trim() || undefined,
      });

      toast.success("Competitor added");
      setIsOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to add competitor", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          resetForm();
        }
      }}
      open={isOpen}
    >
      <DialogTrigger className="inline-flex h-8 items-center justify-center gap-2 rounded-md bg-primary px-3 font-medium text-primary-foreground text-sm shadow-sm hover:bg-primary/90">
        <Plus className="mr-1.5 size-4" />
        Add Competitor
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Competitor</DialogTitle>
          <DialogDescription>
            Track a competitor to receive intelligence insights.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="competitor-name">Name</Label>
            <Input
              autoFocus
              id="competitor-name"
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Corp"
              required
              value={name}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="competitor-website">Website URL</Label>
            <Input
              id="competitor-website"
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
              required
              type="url"
              value={websiteUrl}
            />
            {websiteUrl && !isValidUrl(websiteUrl) && (
              <p className="text-destructive text-xs">
                Please enter a valid URL starting with http:// or https://
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="competitor-description">
              Description{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="competitor-description"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this competitor"
              value={description}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="competitor-changelog">
              Changelog URL{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="competitor-changelog"
              onChange={(e) => setChangelogUrl(e.target.value)}
              placeholder="https://example.com/changelog"
              type="url"
              value={changelogUrl}
            />
            {changelogUrl && !isValidUrl(changelogUrl) && (
              <p className="text-destructive text-xs">
                Please enter a valid URL
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="competitor-pricing">
              Pricing URL{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="competitor-pricing"
              onChange={(e) => setPricingUrl(e.target.value)}
              placeholder="https://example.com/pricing"
              type="url"
              value={pricingUrl}
            />
            {pricingUrl && !isValidUrl(pricingUrl) && (
              <p className="text-destructive text-xs">
                Please enter a valid URL
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="competitor-features">
              Features URL{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="competitor-features"
              onChange={(e) => setFeaturesUrl(e.target.value)}
              placeholder="https://example.com/features"
              type="url"
              value={featuresUrl}
            />
            {featuresUrl && !isValidUrl(featuresUrl) && (
              <p className="text-destructive text-xs">
                Please enter a valid URL
              </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 font-medium text-sm shadow-sm hover:bg-accent hover:text-accent-foreground">
              Cancel
            </DialogClose>
            <Button disabled={!canSubmit} type="submit">
              {isCreating ? "Adding..." : "Add Competitor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
