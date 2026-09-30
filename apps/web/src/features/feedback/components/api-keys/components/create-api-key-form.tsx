"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import { Field, FieldError, FieldLabel } from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Plus } from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";

export function CreateApiKeyForm({
  hasKeys,
  onCreate,
}: {
  hasKeys: boolean;
  onCreate: (name: string) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a name for the key");
      return;
    }
    setIsCreating(true);
    const created = await onCreate(trimmed);
    setIsCreating(false);
    if (created) {
      setName("");
    }
  };

  return (
    <Card>
      <CardContent>
        <form noValidate onSubmit={handleSubmit}>
          <Field>
            <FieldLabel htmlFor="new-api-key-name">
              {hasKeys ? "New key name" : "Key name"}
            </FieldLabel>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                aria-describedby="new-api-key-name-error"
                aria-invalid={error ? true : undefined}
                autoComplete="off"
                id="new-api-key-name"
                onChange={(event) => {
                  setName(event.target.value);
                  setError(null);
                }}
                placeholder="Production website"
                value={name}
              />
              <Button
                disabled={isCreating}
                tone="primary"
                type="submit"
                variant="solid"
              >
                {isCreating ? (
                  <Spinner aria-hidden data-icon="inline-start" size="xs" />
                ) : (
                  <Plus aria-hidden />
                )}
                {isCreating ? "Creating…" : "Create key"}
              </Button>
            </div>
            <FieldError id="new-api-key-name-error" match={error !== null}>
              {error}
            </FieldError>
          </Field>
        </form>
      </CardContent>
    </Card>
  );
}
