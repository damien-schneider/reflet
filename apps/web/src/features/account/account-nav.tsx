"use client";

import { Tabs, TabsList, TabsTab } from "@ctrl-ui/react/ui/tabs";

export type AccountTab =
  | "profile"
  | "email"
  | "password"
  | "notifications"
  | "devtools";

interface AccountNavProps {
  activeTab: AccountTab;
  onTabChange: (tab: AccountTab) => void;
}

const NAV_ITEMS = [
  { id: "profile", label: "Profile" },
  { id: "email", label: "Email" },
  { id: "password", label: "Password" },
  { id: "notifications", label: "Notifications" },
  { id: "devtools", label: "Devtools" },
] as const;

const isAccountTab = (value: string): value is AccountTab =>
  NAV_ITEMS.some((item) => item.id === value);

export function AccountNav({ activeTab, onTabChange }: AccountNavProps) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <Tabs
        onValueChange={(value) => {
          if (isAccountTab(value)) {
            onTabChange(value);
          }
        }}
        value={activeTab}
      >
        <TabsList aria-label="Account settings">
          {NAV_ITEMS.map(({ id, label }) => (
            <TabsTab key={id} value={id}>
              {label}
            </TabsTab>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
