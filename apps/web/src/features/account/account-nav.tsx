"use client";

import { Tabs, TabsList, TabsTab } from "@ctrl-ui/react/ui/tabs";
import { Bell, Envelope, LockKey, User } from "@phosphor-icons/react";

export type AccountTab = "profile" | "email" | "password" | "notifications";

interface AccountNavProps {
  activeTab: AccountTab;
  onTabChange: (tab: AccountTab) => void;
}

const NAV_ITEMS = [
  { icon: User, id: "profile", label: "Profile" },
  { icon: Envelope, id: "email", label: "Email" },
  { icon: LockKey, id: "password", label: "Password" },
  { icon: Bell, id: "notifications", label: "Notifications" },
] as const;

const isAccountTab = (value: string): value is AccountTab =>
  NAV_ITEMS.some((item) => item.id === value);

export function AccountNav({ activeTab, onTabChange }: AccountNavProps) {
  return (
    <Tabs
      onValueChange={(value) => {
        if (isAccountTab(value)) {
          onTabChange(value);
        }
      }}
      value={activeTab}
    >
      <TabsList
        aria-label="Account settings"
        className="grid h-auto w-full grid-cols-2 sm:grid-cols-4 md:flex md:flex-col md:items-stretch [&_[data-slot=indicator]]:hidden"
      >
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <TabsTab
            className="min-h-10 w-full justify-start gap-3 px-3 aria-selected:bg-accent aria-selected:text-accent-foreground"
            key={id}
            value={id}
          >
            <Icon className="size-4" />
            {label}
          </TabsTab>
        ))}
      </TabsList>
    </Tabs>
  );
}
