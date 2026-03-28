import type { Icon } from "@phosphor-icons/react";

export type CommandItemGroup = "navigation" | "actions";

export interface CommandItem {
  description?: string;
  group: CommandItemGroup;
  href: string;
  icon: Icon;
  id: string;
  keywords: string[];
  label: string;
  requiresAdmin?: boolean;
  requiresOrg?: boolean;
}
