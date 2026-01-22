"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  Envelope,
  Eye,
  EyeSlash,
  SignOut,
  Trash,
  User,
} from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import { authClient } from "@/lib/auth-client";

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  avatarUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

const updateEmailSchema = z.object({
  newEmail: z.string().email("Invalid email"),
});

const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
  });

type UpdateProfileForm = z.infer<typeof updateProfileSchema>;
type UpdateEmailForm = z.infer<typeof updateEmailSchema>;
type UpdatePasswordForm = z.infer<typeof updatePasswordSchema>;

interface PasswordInputProps {
  id: string;
  label: string;
  showPassword: boolean;
  onTogglePassword: () => void;
  register: UseFormRegisterReturn;
  placeholder?: string;
  error?: { message?: string };
}

function PasswordInputField({
  id,
  label,
  showPassword,
  onTogglePassword,
  register,
  placeholder,
  error,
}: PasswordInputProps) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <Input
          id={id}
          placeholder={placeholder}
          type={showPassword ? "text" : "password"}
          {...(register as React.ComponentProps<typeof Input>)}
        />
        <button
          className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={onTogglePassword}
          type="button"
        >
          {showPassword ? (
            <EyeSlash className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
        </button>
      </div>
      <FieldError errors={error ? [error] : undefined} />
    </Field>
  );
}

export default function AccountPage() {
  const user = useQuery(api.auth.getCurrentUser);
  const [activeTab, setActiveTab] = useState<"profile" | "email" | "password">(
    "profile"
  );
  const [isLoading, setIsLoading] = useState(false);
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

  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors },
    reset: resetEmail,
  } = useForm<UpdateEmailForm>({
    resolver: zodResolver(updateEmailSchema),
    mode: "onChange",
    defaultValues: {
      newEmail: "",
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<UpdatePasswordForm>({
    resolver: zodResolver(updatePasswordSchema),
    mode: "onChange",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handleSignOut = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/";
        },
      },
    });
  };

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

  const handleUpdateEmail = async (data: UpdateEmailForm) => {
    setIsLoading(true);
    try {
      await authClient.changeEmail({
        newEmail: data.newEmail,
        callbackURL: `${window.location.origin}/dashboard/account`,
      });
      toast.success("Email updated. Please check your inbox for verification.");
      resetEmail();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update email"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (data: UpdatePasswordForm) => {
    setIsLoading(true);
    try {
      await authClient.changePassword({
        newPassword: data.newPassword,
        currentPassword: data.currentPassword,
      });
      toast.success("Password updated successfully");
      resetPassword();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update password"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const currentAvatar = avatarUrl || user?.image;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-semibold text-2xl">Account Settings</h1>
          <p className="text-muted-foreground text-sm">
            Manage your personal account settings
          </p>
        </div>
        <Button className="gap-2" onClick={handleSignOut} variant="outline">
          <SignOut className="size-4" />
          Sign out
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-[250px_1fr]">
        <nav className="flex flex-col gap-1 md:space-y-1">
          <button
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-left font-medium text-sm transition-colors ${
              activeTab === "profile"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
            onClick={() => setActiveTab("profile")}
            type="button"
          >
            <User className="size-4" />
            Profile
          </button>
          <button
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-left font-medium text-sm transition-colors ${
              activeTab === "email"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
            onClick={() => setActiveTab("email")}
            type="button"
          >
            <Envelope className="size-4" />
            Email
          </button>
          <button
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-left font-medium text-sm transition-colors ${
              activeTab === "password"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
            onClick={() => setActiveTab("password")}
            type="button"
          >
            <Envelope className="size-4" />
            Password
          </button>
        </nav>

        <div className="space-y-6">
          {activeTab === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>
                  Update your profile information
                </CardDescription>
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
                      errors={
                        profileErrors.name ? [profileErrors.name] : undefined
                      }
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
                        profileErrors.avatarUrl
                          ? [profileErrors.avatarUrl]
                          : undefined
                      }
                    />
                    <p className="text-muted-foreground text-xs">
                      Provide a direct link to your avatar image (e.g., from
                      Gravatar, Imgur, or any image hosting service)
                    </p>
                  </Field>

                  {currentAvatar && (
                    <div className="flex items-center gap-4 rounded-lg border p-4">
                      <img
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
          )}

          {activeTab === "email" && (
            <Card>
              <CardHeader>
                <CardTitle>Email</CardTitle>
                <CardDescription>Change your email address</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4 rounded-lg bg-muted p-4">
                  <div className="flex size-12 items-center justify-center rounded-none bg-background">
                    <Envelope className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-muted-foreground text-sm">
                      Current Email
                    </p>
                    <p className="font-medium">{user?.email ?? "N/A"}</p>
                  </div>
                </div>

                <Separator />

                <form
                  className="space-y-4"
                  onSubmit={handleSubmitEmail(handleUpdateEmail)}
                >
                  <Field>
                    <FieldLabel htmlFor="newEmail">New Email</FieldLabel>
                    <Input
                      id="newEmail"
                      placeholder="new@example.com"
                      type="email"
                      {...registerEmail("newEmail")}
                    />
                    <FieldError
                      errors={
                        emailErrors.newEmail
                          ? [emailErrors.newEmail]
                          : undefined
                      }
                    />
                  </Field>

                  <Button
                    className="w-full md:w-auto"
                    disabled={isLoading}
                    type="submit"
                  >
                    <Check className="mr-2 size-4" />
                    Update Email
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === "password" && (
            <Card>
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>Change your password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form
                  className="space-y-4"
                  onSubmit={handleSubmitPassword(handleUpdatePassword)}
                >
                  <PasswordInputField
                    error={passwordErrors.currentPassword}
                    id="currentPassword"
                    label="Current Password"
                    onTogglePassword={() =>
                      setShowPassword({
                        ...showPassword,
                        current: !showPassword.current,
                      })
                    }
                    placeholder="Enter your current password"
                    register={registerPassword("currentPassword")}
                    showPassword={showPassword.current}
                  />

                  <PasswordInputField
                    error={passwordErrors.newPassword}
                    id="newPassword"
                    label="New Password"
                    onTogglePassword={() =>
                      setShowPassword({
                        ...showPassword,
                        new: !showPassword.new,
                      })
                    }
                    placeholder="Enter your new password"
                    register={registerPassword("newPassword")}
                    showPassword={showPassword.new}
                  />
                  <p className="text-muted-foreground text-xs">
                    Password must be at least 8 characters
                  </p>

                  <PasswordInputField
                    error={passwordErrors.confirmPassword}
                    id="confirmPassword"
                    label="Confirm New Password"
                    onTogglePassword={() =>
                      setShowPassword({
                        ...showPassword,
                        confirm: !showPassword.confirm,
                      })
                    }
                    placeholder="Confirm your new password"
                    register={registerPassword("confirmPassword")}
                    showPassword={showPassword.confirm}
                  />

                  <Button
                    className="w-full md:w-auto"
                    disabled={isLoading}
                    type="submit"
                  >
                    <Check className="mr-2 size-4" />
                    Update Password
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
