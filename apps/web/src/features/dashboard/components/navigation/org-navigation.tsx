import {
  Binoculars,
  Chat,
  ChatCircle,
  ClipboardText,
  Code,
  CreditCard,
  FileText,
  Gear,
  GithubLogo,
  Globe,
  Heartbeat,
  Key,
  TerminalWindow,
  Trash,
  Users,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  NavGroup,
  type NavItem,
} from "@/features/dashboard/components/navigation/nav-group";

function workspaceItems(base: string, unread: number | undefined): NavItem[] {
  return [
    {
      childRoutePrefix: `${base}/feedback`,
      href: base,
      icon: Chat,
      label: "Feedback",
    },
    { href: `${base}/changelog`, icon: FileText, label: "Changelog" },
    {
      adminOnly: true,
      badge: unread
        ? { count: unread, label: "unread", tone: "attention" }
        : undefined,
      href: `${base}/inbox`,
      icon: ChatCircle,
      label: "Inbox",
    },
    {
      adminOnly: true,
      href: `${base}/surveys`,
      icon: ClipboardText,
      label: "Surveys",
    },
    {
      adminOnly: true,
      href: `${base}/intelligence`,
      icon: Binoculars,
      label: "Intelligence",
    },
    {
      adminOnly: true,
      href: `${base}/status`,
      icon: Heartbeat,
      label: "Status",
    },
  ];
}

function developerItems(base: string): NavItem[] {
  return [
    { href: `${base}/project/github`, icon: GithubLogo, label: "GitHub" },
    {
      href: `${base}/project/agents`,
      icon: TerminalWindow,
      label: "Agents & CLI",
    },
    { href: `${base}/project/api-keys`, icon: Key, label: "API keys" },
    { adminOnly: true, href: `${base}/in-app`, icon: Code, label: "In-app" },
  ];
}

function organizationItems(
  base: string,
  deleted: number | undefined
): NavItem[] {
  return [
    { href: `${base}/project/general`, icon: Gear, label: "General" },
    { href: `${base}/project/members`, icon: Users, label: "Members" },
    { href: `${base}/project/domains`, icon: Globe, label: "Domains" },
    { href: `${base}/project/billing`, icon: CreditCard, label: "Billing" },
    {
      adminOnly: true,
      badge: deleted
        ? { count: deleted, label: "in trash", tone: "neutral" }
        : undefined,
      href: `${base}/trash`,
      icon: Trash,
      label: "Trash",
    },
  ];
}

interface OrgNavigationProps {
  organization: {
    id: Id<"organizations"> | undefined;
    slug: string;
    isAdmin: boolean;
  };
  pathname: string;
}

export function OrgNavigation({ organization, pathname }: OrgNavigationProps) {
  const { id, slug, isAdmin } = organization;
  const adminArgs = id && isAdmin ? { organizationId: id } : "skip";
  const unread = useQuery(api.support.admin.getUnreadCount, adminArgs);
  const deleted = useQuery(api.feedback.trash.getDeletedCount, adminArgs);
  const base = `/dashboard/${slug}`;
  const groups = [
    { items: workspaceItems(base, unread), label: "Workspace" },
    { items: developerItems(base), label: "Developer tools" },
    { items: organizationItems(base, deleted), label: "Organization" },
  ];
  return groups.map(({ label, items }) => (
    <NavGroup
      items={items.filter((item) => isAdmin || !item.adminOnly)}
      key={label}
      label={label}
      pathname={pathname}
    />
  ));
}
