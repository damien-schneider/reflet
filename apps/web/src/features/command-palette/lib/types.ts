import type { Icon } from "@phosphor-icons/react";

export type CommandItemGroup = "navigation" | "settings" | "actions";

export interface CommandItem {
  id: string;
  label: string;
  keywords: string[];
  group: CommandItemGroup;
  href: string;
  icon: Icon;
  description?: string;
  requiresOrg?: boolean;
  requiresAdmin?: boolean;
}
