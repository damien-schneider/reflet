"use client";

import { Bell, Envelope, LockKey, User } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

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

export function AccountNav({ activeTab, onTabChange }: AccountNavProps) {
  return (
    <nav className="grid grid-cols-2 gap-1 sm:grid-cols-4 md:flex md:flex-col">
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
        <button
          aria-pressed={activeTab === id}
          className={cn(
            "flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-left font-medium text-sm transition-colors",
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
