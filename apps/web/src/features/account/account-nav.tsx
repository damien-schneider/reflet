"use client";

import { Bell, Envelope, User } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type AccountTab = "profile" | "email" | "password" | "notifications";

interface AccountNavProps {
  activeTab: AccountTab;
  onTabChange: (tab: AccountTab) => void;
}

const NAV_ITEMS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "email", label: "Email", icon: Envelope },
  { id: "password", label: "Password", icon: Envelope },
  { id: "notifications", label: "Notifications", icon: Bell },
] as const;

export function AccountNav({ activeTab, onTabChange }: AccountNavProps) {
  return (
    <nav className="flex flex-col gap-1 md:space-y-1">
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
        <button
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-left font-medium text-sm transition-colors",
            activeTab === id
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
          key={id}
          onClick={() => onTabChange(id)}
          type="button"
        >
          <Icon className="size-4" />
          {label}
        </button>
      ))}
    </nav>
  );
}
