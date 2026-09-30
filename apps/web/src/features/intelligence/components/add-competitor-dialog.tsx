"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ctrl-ui/react/ui/dialog";
import { Input } from "@ctrl-ui/react/ui/input";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Plus } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { type FormEvent, type ReactNode, useId, useState } from "react";
import { Label } from "@/components/ui/label";

const URL_PATTERN = /^https?:\/\/.+\..+/;

const EMPTY_FORM = {
  changelogUrl: "",
  description: "",
  featuresUrl: "",
  name: "",
  pricingUrl: "",
  websiteUrl: "",
};
type FormValues = typeof EMPTY_FORM;
type UrlKey = "websiteUrl" | "changelogUrl" | "pricingUrl" | "featuresUrl";

const OPTIONAL_URL_FIELDS = [
  {
    key: "changelogUrl",
    label: "Changelog URL",
    placeholder: "https://example.com/changelog",
  },
  {
    key: "pricingUrl",
    label: "Pricing URL",
    placeholder: "https://example.com/pricing",
  },
  {
    key: "featuresUrl",
    label: "Features URL",
    placeholder: "https://example.com/features",
  },
] as const;

const urlError = (value: string, required: boolean): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? "Enter the competitor’s website." : null;
  }
  return URL_PATTERN.test(trimmed)
    ? null
    : "Enter a full URL starting with https://";
};

function FieldBlock({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: ReactNode;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p className="text-destructive-text text-xs" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

const optionalLabel = (text: string) => (
  <>
    {text} <span className="font-normal text-muted-foreground">(optional)</span>
  </>
);

interface AddCompetitorDialogProps {
  organizationId: Id<"organizations">;
}

export function AddCompetitorDialog({
  organizationId,
}: AddCompetitorDialogProps) {
  const createCompetitor = useMutation(api.intelligence.competitors.create);
  const formId = useId();

  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [touched, setTouched] = useState<Partial<Record<UrlKey, boolean>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setField = (key: keyof FormValues, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const errorFor = (key: UrlKey) =>
    touched[key] ? urlError(values[key], key === "websiteUrl") : null;

  const urlInputProps = (key: UrlKey) => {
    const error = errorFor(key);
    return {
      "aria-describedby": error ? `${formId}-${key}-error` : undefined,
      "aria-invalid": error ? true : undefined,
      autoCapitalize: "none",
      autoComplete: "url",
      id: `${formId}-${key}`,
      inputMode: "url",
      onBlur: () => setTouched((prev) => ({ ...prev, [key]: true })),
      onChange: (e: { target: { value: string } }) =>
        setField(key, e.target.value),
      spellCheck: false,
      type: "url",
      value: values[key],
    } as const;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({
      changelogUrl: true,
      featuresUrl: true,
      pricingUrl: true,
      websiteUrl: true,
    });
    const hasUrlError =
      urlError(values.websiteUrl, true) !== null ||
      OPTIONAL_URL_FIELDS.some(({ key }) => urlError(values[key], false));
    if (!values.name.trim() || hasUrlError || isCreating) {
      return;
    }

    const competitor = {
      changelogUrl: values.changelogUrl.trim() || undefined,
      description: values.description.trim() || undefined,
      featuresUrl: values.featuresUrl.trim() || undefined,
      name: values.name.trim(),
      organizationId,
      pricingUrl: values.pricingUrl.trim() || undefined,
      websiteUrl: values.websiteUrl.trim(),
    };
    setIsCreating(true);
    setSubmitError(null);
    try {
      await createCompetitor(competitor);
      handleOpenChange(false);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Couldn’t add the competitor. Try again."
      );
    }
    setIsCreating(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setValues(EMPTY_FORM);
      setTouched({});
      setSubmitError(null);
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={isOpen}>
      <DialogTrigger render={<Button tone="primary" variant="solid" />}>
        <Plus data-icon="inline-start" />
        Add competitor
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add competitor</DialogTitle>
          <DialogDescription>
            Track a competitor to get insights on their product and pricing.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          id={formId}
          noValidate
          onSubmit={handleSubmit}
        >
          <FieldBlock id={`${formId}-name`} label="Name">
            <Input
              autoComplete="organization"
              autoFocus
              id={`${formId}-name`}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Acme"
              required
              value={values.name}
            />
          </FieldBlock>
          <FieldBlock
            error={errorFor("websiteUrl")}
            id={`${formId}-websiteUrl`}
            label="Website URL"
          >
            <Input
              placeholder="https://example.com"
              required
              {...urlInputProps("websiteUrl")}
            />
          </FieldBlock>
          <FieldBlock
            id={`${formId}-description`}
            label={optionalLabel("Description")}
          >
            <Input
              id={`${formId}-description`}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="What they sell and who to"
              value={values.description}
            />
          </FieldBlock>
          {OPTIONAL_URL_FIELDS.map((field) => (
            <FieldBlock
              error={errorFor(field.key)}
              id={`${formId}-${field.key}`}
              key={field.key}
              label={optionalLabel(field.label)}
            >
              <Input
                placeholder={field.placeholder}
                {...urlInputProps(field.key)}
              />
            </FieldBlock>
          ))}
          {submitError && (
            <p className="text-destructive-text text-sm" role="alert">
              {submitError}
            </p>
          )}
        </form>
        <DialogFooter>
          <DialogClose variant="surface">Cancel</DialogClose>
          <Button
            disabled={isCreating}
            form={formId}
            tone="primary"
            type="submit"
            variant="solid"
          >
            {isCreating && <Spinner data-icon="inline-start" size="xs" />}
            {isCreating ? "Adding…" : "Add competitor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
