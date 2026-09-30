"use client";

import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import { AccountNav, type AccountTab } from "@/features/account/account-nav";
import { DevtoolsConnectionsSection } from "@/features/account/devtools-connections-section";
import { EmailSection } from "@/features/account/email-section";
import { NotificationSettings } from "@/features/account/notification-settings";
import { PasswordSection } from "@/features/account/password-section";
import { ProfileSection } from "@/features/account/profile-section";
import { SettingsPage } from "@/features/project/components/settings-page";

export default function AccountPage() {
  const user = useQuery(api.auth.queries.getCurrentUser);
  const [activeTab, setActiveTab] = useState<AccountTab>("profile");
  const [isLoading, setIsLoading] = useState(false);
  const isUserLoading = user === undefined;
  const needsUser = activeTab === "profile" || activeTab === "email";

  return (
    <SettingsPage
      description="Manage your profile, sign-in details, and notifications."
      title="Account"
    >
      <AccountNav activeTab={activeTab} onTabChange={setActiveTab} />

      {needsUser && isUserLoading ? (
        <div aria-busy="true" className="flex max-w-md flex-col gap-4">
          <p className="sr-only" role="status">
            Loading account…
          </p>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-5 w-72 max-w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}

      {activeTab === "profile" && !isUserLoading ? (
        <ProfileSection
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          user={user ?? undefined}
        />
      ) : null}
      {activeTab === "email" && !isUserLoading ? (
        <EmailSection
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          user={user ?? undefined}
        />
      ) : null}
      {activeTab === "password" ? (
        <PasswordSection isLoading={isLoading} setIsLoading={setIsLoading} />
      ) : null}
      {activeTab === "notifications" ? <NotificationSettings /> : null}
      {activeTab === "devtools" ? <DevtoolsConnectionsSection /> : null}
    </SettingsPage>
  );
}
