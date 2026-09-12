"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Field, FieldError, FieldLabel } from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { Separator } from "@ctrl-ui/react/ui/separator";
import { toast } from "@ctrl-ui/react/ui/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Envelope, Trash, User } from "@phosphor-icons/react";
import Image from "next/image";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { H3, Muted, Text } from "@/components/ui/typography";
import {
  type UpdateProfileForm,
  updateProfileSchema,
} from "@/features/account/account-schemas";
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
  const [avatarUrl, setAvatarUrl] = useState("");

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors, isDirty: isProfileDirty },
    reset: resetProfile,
  } = useForm<UpdateProfileForm>({
    defaultValues: {
      avatarUrl: "",
      name: user?.name ?? "",
    },
    mode: "onChange",
    resolver: zodResolver(updateProfileSchema),
  });

  const handleUpdateProfile = async (data: UpdateProfileForm) => {
    setIsLoading(true);
    try {
      await authClient.updateUser({
        image: avatarUrl || undefined,
        name: data.name,
      });
      toast.success("Profile updated successfully");
      resetProfile();
      setAvatarUrl("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const currentAvatar = avatarUrl || user?.image;

  return (
    <section className="space-y-6">
      <H3 variant="section">Profile</H3>

      <form
        className="space-y-4"
        onSubmit={handleSubmitProfile(handleUpdateProfile)}
      >
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            {...registerProfile("name")}
            defaultValue={user?.name ?? ""}
          />
          <FieldError match={Boolean(profileErrors.name?.message)}>
            {profileErrors.name?.message}
          </FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="avatarUrl">Avatar URL</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="avatarUrl"
              placeholder="https://example.com/avatar.jpg"
              {...registerProfile("avatarUrl")}
              onChange={(e) => setAvatarUrl(e.target.value)}
              value={avatarUrl}
            />
            {avatarUrl && (
              <Button
                iconOnly
                onClick={() => setAvatarUrl("")}
                type="button"
                variant="ghost"
              >
                <Trash className="size-4" />
              </Button>
            )}
          </div>
          <FieldError match={Boolean(profileErrors.avatarUrl?.message)}>
            {profileErrors.avatarUrl?.message}
          </FieldError>
        </Field>

        {currentAvatar && (
          <div className="flex items-center gap-4 rounded-lg border p-4">
            <Image
              alt="Avatar preview"
              className="size-16 rounded-none object-cover"
              height={64}
              src={currentAvatar}
              width={64}
            />
            <div className="text-sm">
              <Text variant="label">Avatar Preview</Text>
              <Text variant="caption">{currentAvatar.slice(0, 50)}...</Text>
            </div>
          </div>
        )}

        <Separator />

        <div className="flex items-center gap-4 rounded-lg bg-muted p-4">
          <div className="flex size-12 items-center justify-center rounded-none bg-background">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <Text variant="label">{user?.name ?? "User"}</Text>
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <Envelope className="h-3 w-3" />
              <Muted as="span">{user?.email ?? ""}</Muted>
            </div>
          </div>
        </div>

        <Button
          className="w-full md:w-auto"
          disabled={isLoading || !isProfileDirty}
          tone="primary"
          type="submit"
          variant="solid"
        >
          <Check className="mr-2 size-4" />
          Save Changes
        </Button>
      </form>
    </section>
  );
}
