"use client";

import { SignOut } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { H1, Muted } from "@/components/ui/typography";
import { AccountNav, type AccountTab } from "@/features/account/account-nav";
import { EmailSection } from "@/features/account/email-section";
import { NotificationSettings } from "@/features/account/notification-settings";
import { PasswordSection } from "@/features/account/password-section";
import { ProfileSection } from "@/features/account/profile-section";
import { authClient } from "@/lib/auth-client";

export default function AccountPage() {
  const user = useQuery(api.auth.getCurrentUser);
  const [activeTab, setActiveTab] = useState<AccountTab>("profile");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/";
        },
      },
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <H1 variant="page">Account Settings</H1>
          <Muted>Manage your personal account settings</Muted>
        </div>
        <Button className="gap-2" onClick={handleSignOut} variant="outline">
          <SignOut className="size-4" />
          Sign out
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-[250px_1fr]">
        <AccountNav activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="space-y-6">
          {activeTab === "profile" && (
            <ProfileSection
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              user={user ?? undefined}
            />
          )}
          {activeTab === "email" && (
            <EmailSection
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              user={user ?? undefined}
            />
          )}
          {activeTab === "password" && (
            <PasswordSection
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          )}
          {activeTab === "notifications" && <NotificationSettings />}
        </div>
      </div>
    </div>
  );
}
