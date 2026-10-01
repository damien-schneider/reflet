"use client";

import { Tabs, TabsList, TabsTab } from "@ctrl-ui/react/ui/tabs";

import {
  ACCOUNT_NAV_ITEMS,
  type AccountTab,
  accountTabSchema,
} from "@/features/account/lib/account-tabs";

interface AccountNavProps {
  activeTab: AccountTab;
  onTabChange: (tab: AccountTab) => void;
}

export function AccountNav({ activeTab, onTabChange }: AccountNavProps) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <Tabs
        onValueChange={(value) => {
          const tab = accountTabSchema.safeParse(value);
          if (tab.success) {
            onTabChange(tab.data);
          }
        }}
        value={activeTab}
      >
        <TabsList aria-label="Account settings">
          {ACCOUNT_NAV_ITEMS.map(({ id, label }) => (
            <TabsTab key={id} value={id}>
              {label}
            </TabsTab>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
