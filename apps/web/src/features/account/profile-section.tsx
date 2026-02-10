"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Envelope, Trash, User } from "@phosphor-icons/react";
import Image from "next/image";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  type UpdateProfileForm,
  updateProfileSchema,
} from "@/features/account/account-schemas";
import { authClient } from "@/lib/auth-client";

interface ProfileSectionProps {
  user:
    | { name?: string | null; email?: string | null; image?: string | null }
    | undefined;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
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
    resolver: zodResolver(updateProfileSchema),
    mode: "onChange",
    defaultValues: {
      name: user?.name ?? "",
      avatarUrl: "",
    },
  });

  const handleUpdateProfile = async (data: UpdateProfileForm) => {
    setIsLoading(true);
    try {
      await authClient.updateUser({
        name: data.name,
        image: avatarUrl || undefined,
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
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Update your profile information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
            <FieldError
              errors={profileErrors.name ? [profileErrors.name] : undefined}
            />
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
                  onClick={() => setAvatarUrl("")}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash className="size-4" />
                </Button>
              )}
            </div>
            <FieldError
              errors={
                profileErrors.avatarUrl ? [profileErrors.avatarUrl] : undefined
              }
            />
            <p className="text-muted-foreground text-xs">
              Provide a direct link to your avatar image (e.g., from Gravatar,
              Imgur, or any image hosting service)
            </p>
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
                <p className="font-medium">Avatar Preview</p>
                <p className="text-muted-foreground text-xs">
                  {currentAvatar.slice(0, 50)}...
                </p>
              </div>
            </div>
          )}

          <Separator />

          <div className="flex items-center gap-4 rounded-lg bg-muted p-4">
            <div className="flex size-12 items-center justify-center rounded-none bg-background">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{user?.name ?? "User"}</p>
              <div className="flex items-center gap-1 text-muted-foreground text-sm">
                <Envelope className="h-3 w-3" />
                <span>{user?.email ?? ""}</span>
              </div>
            </div>
          </div>

          <Button
            className="w-full md:w-auto"
            disabled={isLoading || !isProfileDirty}
            type="submit"
          >
            <Check className="mr-2 size-4" />
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
