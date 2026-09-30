"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { toast } from "@ctrl-ui/react/ui/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, X } from "@phosphor-icons/react";
import Image from "next/image";
import { useForm, useWatch } from "react-hook-form";
import {
  type UpdateProfileForm,
  updateProfileSchema,
} from "@/features/account/account-schemas";
import { SettingsSection } from "@/features/project/components/settings-page";
import { authClient } from "@/lib/auth-client";

interface ProfileSectionProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  user:
    | { name?: string | null; email?: string | null; image?: string | null }
    | undefined;
}

export function ProfileSection({
  user,
  isLoading,
  setIsLoading,
}: ProfileSectionProps) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
  } = useForm<UpdateProfileForm>({
    defaultValues: { avatarUrl: "", name: user?.name ?? "" },
    mode: "onTouched",
    resolver: zodResolver(updateProfileSchema),
  });

  const avatarUrl = useWatch({ control, name: "avatarUrl" }) ?? "";
  const previewSrc = avatarUrl || user?.image;
  const displayName = user?.name || "Your profile";

  const handleUpdateProfile = async (data: UpdateProfileForm) => {
    setIsLoading(true);
    try {
      await authClient.updateUser({
        image: data.avatarUrl || undefined,
        name: data.name,
      });
      reset({ avatarUrl: "", name: data.name });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile"
      );
    }
    setIsLoading(false);
  };

  return (
    <SettingsSection
      description="Your name and avatar across Reflet."
      title="Profile"
    >
      <div className="flex items-center gap-4">
        {previewSrc ? (
          <Image
            alt="Avatar preview"
            className="size-14 shrink-0 rounded-full object-cover outline-1 outline-black/10 -outline-offset-1 dark:outline-white/10"
            height={56}
            src={previewSrc}
            unoptimized
            width={56}
          />
        ) : (
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted">
            <User aria-hidden className="size-6 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-label">{displayName}</p>
          {user?.email ? (
            <p
              className="truncate text-caption text-muted-foreground"
              title={user.email}
            >
              {user.email}
            </p>
          ) : null}
        </div>
      </div>

      <form
        className="flex max-w-md flex-col gap-4"
        noValidate
        onSubmit={handleSubmit(handleUpdateProfile)}
      >
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            aria-invalid={Boolean(errors.name) || undefined}
            autoComplete="name"
            id="name"
            {...register("name")}
          />
          <FieldError match={Boolean(errors.name?.message)}>
            {errors.name?.message}
          </FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="avatarUrl">Avatar URL</FieldLabel>
          <div className="flex gap-2">
            <Input
              aria-invalid={Boolean(errors.avatarUrl) || undefined}
              autoComplete="photo"
              id="avatarUrl"
              inputMode="url"
              placeholder="https://example.com/avatar.jpg"
              spellCheck={false}
              type="url"
              {...register("avatarUrl")}
            />
            {avatarUrl ? (
              <Button
                aria-label="Clear avatar URL"
                iconOnly
                onClick={() => setValue("avatarUrl", "", { shouldDirty: true })}
                type="button"
                variant="ghost"
              >
                <X />
              </Button>
            ) : null}
          </div>
          <FieldDescription>
            Leave empty to keep your current avatar.
          </FieldDescription>
          <FieldError match={Boolean(errors.avatarUrl?.message)}>
            {errors.avatarUrl?.message}
          </FieldError>
        </Field>

        <div>
          <Button
            disabled={isLoading || !isDirty}
            tone="primary"
            type="submit"
            variant="solid"
          >
            {isLoading ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}
