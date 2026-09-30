"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ctrl-ui/react/ui/dialog";
import { Field, FieldError, FieldLabel } from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";

const ALLOWED_PROTOCOLS = ["http:", "https:"];

interface AddWebsiteDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  organizationId: Id<"organizations">;
}

function validateUrl(value: string): string | null {
  if (!value) {
    return "Enter a URL";
  }
  try {
    if (!ALLOWED_PROTOCOLS.includes(new URL(value).protocol)) {
      return "Use a URL that starts with http:// or https://";
    }
  } catch {
    return "Enter a valid URL, like https://example.com/docs";
  }
  return null;
}

export function AddWebsiteDialog({
  open,
  onOpenChange,
  organizationId,
}: AddWebsiteDialogProps) {
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createReference = useMutation(
    api.integrations.website_references.create
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = url.trim();
    const validationError = validateUrl(trimmedUrl);
    setError(validationError);
    if (validationError) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createReference({ organizationId, url: trimmedUrl });
      setUrl("");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t add the website");
    }
    setIsSubmitting(false);
  };

  const handleClose = () => {
    setUrl("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog onOpenChange={handleClose} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add website reference</DialogTitle>
          <DialogDescription>
            Reflet reads the page and uses it as context when the AI clarifies
            and analyzes feedback.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={handleSubmit}
        >
          <Field>
            <FieldLabel htmlFor="website-reference-url">Website URL</FieldLabel>
            <Input
              aria-describedby={
                error ? "website-reference-url-error" : undefined
              }
              aria-invalid={error ? true : undefined}
              autoComplete="url"
              id="website-reference-url"
              inputMode="url"
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              placeholder="https://example.com/docs"
              spellCheck={false}
              type="url"
              value={url}
            />
            <FieldError
              id="website-reference-url-error"
              match={error !== null}
              role="alert"
            >
              {error}
            </FieldError>
          </Field>

          <DialogFooter>
            <Button onClick={handleClose} type="button" variant="surface">
              Cancel
            </Button>
            <Button
              disabled={isSubmitting || !url.trim()}
              tone="primary"
              type="submit"
              variant="solid"
            >
              {isSubmitting ? (
                <Spinner aria-hidden data-icon="inline-start" size="xs" />
              ) : null}
              {isSubmitting ? "Adding…" : "Add website"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
