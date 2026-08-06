"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import { H1 } from "@/components/ui/typography";
import { AccountNav, type AccountTab } from "@/features/account/account-nav";
import { EmailSection } from "@/features/account/email-section";
import { NotificationSettings } from "@/features/account/notification-settings";
import { PasswordSection } from "@/features/account/password-section";
import { ProfileSection } from "@/features/account/profile-section";

export default function AccountPage() {
  const user = useQuery(api.auth.queries.getCurrentUser);
  const [activeTab, setActiveTab] = useState<AccountTab>("profile");
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="space-y-6 p-6">
      <H1 variant="page">Account</H1>

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
