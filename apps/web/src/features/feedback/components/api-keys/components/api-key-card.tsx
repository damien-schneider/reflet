"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ctrl-ui/react/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { Switch } from "@ctrl-ui/react/ui/switch";
import { ArrowsClockwise, Plus, Trash, X } from "@phosphor-icons/react";
import { format } from "date-fns";
import { type FormEvent, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import type { ApiKeyId, ApiKeyListItem } from "../hooks/use-api-keys";

const DOMAIN_PATTERN =
  /^(\*\.)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?$|^localhost(:\d+)?$/i;
const URL_PREFIX_PATTERN = /^https?:\/\//i;
const TRAILING_SLASH_PATTERN = /\/+$/;
const MASKED_SECRET = "fb_sec_••••••••••••••••";

const DATE_FORMAT = "MMM d, yyyy";

interface ApiKeyCardProps {
  apiKey: ApiKeyListItem;
  onDelete: (apiKey: ApiKeyListItem) => void;
  onRegenerate: (apiKey: ApiKeyListItem) => void;
  onSetAllowedDomains: (
    apiKeyId: ApiKeyId,
    allowedDomains: string[]
  ) => Promise<boolean>;
  onToggleActive: (apiKeyId: ApiKeyId, isActive: boolean) => void;
}

export function ApiKeyCard({
  apiKey,
  onDelete,
  onRegenerate,
  onSetAllowedDomains,
  onToggleActive,
}: ApiKeyCardProps) {
  const fieldId = `api-key-${apiKey.apiKeyId}`;
  return (
    <Card variant="sectioned">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {apiKey.name}
          {apiKey.isActive ? null : (
            <Badge color="neutral" size="sm">
              Inactive
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Created{" "}
          <time dateTime={new Date(apiKey.createdAt).toISOString()}>
            {format(apiKey.createdAt, DATE_FORMAT)}
          </time>
          {apiKey.lastUsedAt ? (
            <>
              {" · "}Last used{" "}
              <time dateTime={new Date(apiKey.lastUsedAt).toISOString()}>
                {format(apiKey.lastUsedAt, DATE_FORMAT)}
              </time>
            </>
          ) : (
            " · Never used"
          )}
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          <Switch
            aria-label={`Enable ${apiKey.name}`}
            checked={apiKey.isActive}
            onCheckedChange={(checked) =>
              onToggleActive(apiKey.apiKeyId, checked)
            }
          />
          <Button
            aria-label={`Delete ${apiKey.name}`}
            iconOnly
            onClick={() => onDelete(apiKey)}
            size="sm"
            tone="danger"
            variant="ghost"
          >
            <Trash aria-hidden />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <Field>
          <FieldLabel htmlFor={`${fieldId}-public`}>Public key</FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              className="font-mono"
              id={`${fieldId}-public`}
              onFocus={(event) => event.target.select()}
              readOnly
              value={apiKey.publicKey}
            />
            <CopyButton label="Copy public key" value={apiKey.publicKey} />
          </div>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${fieldId}-secret`}>Secret key</FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              aria-describedby={`${fieldId}-secret-hint`}
              className="font-mono"
              id={`${fieldId}-secret`}
              readOnly
              value={MASKED_SECRET}
            />
            <Button
              onClick={() => onRegenerate(apiKey)}
              size="sm"
              variant="surface"
            >
              <ArrowsClockwise aria-hidden />
              Regenerate
            </Button>
          </div>
          <FieldDescription id={`${fieldId}-secret-hint`}>
            Secret keys are shown once. Regenerate to get a new one.
          </FieldDescription>
        </Field>
        <AllowedDomains
          apiKey={apiKey}
          fieldId={fieldId}
          onSetAllowedDomains={onSetAllowedDomains}
        />
      </CardContent>
    </Card>
  );
}

function AllowedDomains({
  apiKey,
  fieldId,
  onSetAllowedDomains,
}: {
  apiKey: ApiKeyListItem;
  fieldId: string;
  onSetAllowedDomains: ApiKeyCardProps["onSetAllowedDomains"];
}) {
  const [domainInput, setDomainInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const domains = apiKey.allowedDomains ?? [];
  const inputId = `${fieldId}-domain`;

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    const domain = domainInput
      .trim()
      .toLowerCase()
      .replace(URL_PREFIX_PATTERN, "")
      .replace(TRAILING_SLASH_PATTERN, "");
    if (!DOMAIN_PATTERN.test(domain)) {
      setError("Enter a domain like example.com");
      return;
    }
    if (domains.includes(domain)) {
      setError("This domain is already allowed");
      return;
    }
    if (await onSetAllowedDomains(apiKey.apiKeyId, [...domains, domain])) {
      setDomainInput("");
    }
  };

  return (
    <form className="flex flex-col gap-2" noValidate onSubmit={handleAdd}>
      <Field>
        <FieldLabel htmlFor={inputId}>Allowed domains</FieldLabel>
        <FieldDescription>
          Restrict requests to these domains. Leave empty to allow all.
        </FieldDescription>
        {domains.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {domains.map((domain) => (
              <li
                className="flex items-center gap-1 rounded-md border border-border py-0.5 ps-2 pe-0.5 font-mono text-caption"
                key={domain}
              >
                {domain}
                <Button
                  aria-label={`Remove ${domain}`}
                  iconOnly
                  onClick={() =>
                    onSetAllowedDomains(
                      apiKey.apiKeyId,
                      domains.filter((item) => item !== domain)
                    )
                  }
                  size="xs"
                  variant="ghost"
                >
                  <X aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex items-center gap-2">
          <Input
            aria-describedby={`${inputId}-error`}
            aria-invalid={error ? true : undefined}
            autoComplete="off"
            id={inputId}
            onChange={(event) => {
              setDomainInput(event.target.value);
              setError(null);
            }}
            placeholder="example.com"
            spellCheck={false}
            value={domainInput}
          />
          <Button size="sm" type="submit" variant="surface">
            <Plus aria-hidden />
            Add
          </Button>
        </div>
        <FieldError id={`${inputId}-error`} match={error !== null}>
          {error}
        </FieldError>
      </Field>
    </form>
  );
}
