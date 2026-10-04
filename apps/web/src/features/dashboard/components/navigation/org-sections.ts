import {
  Binoculars,
  ChartBar,
  Chat,
  ChatCircle,
  ClipboardText,
  Code,
  Copy,
  CreditCard,
  FileText,
  Gear,
  GithubLogo,
  Globe,
  Hash,
  Heartbeat,
  type Icon,
  Key,
  Lightbulb,
  NotePencil,
  PauseCircle,
  PlayCircle,
  Scroll,
  Stack,
  TerminalWindow,
  Trash,
  Tray,
  Users,
  XCircle,
} from "@phosphor-icons/react";
import type { NavItem } from "@/features/dashboard/components/navigation/nav-group";

export interface NavSection extends NavItem {
  icon: Icon;
  items?: NavItem[];
  manage?: boolean;
}

interface OrgSectionsOptions {
  counts?: { deleted?: number; unread?: number };
  isAdmin: boolean;
  slug: string;
}

function feedbackItems(base: string): NavItem[] {
  return [
    {
      childRoutePrefix: `${base}/feedback`,
      href: base,
      icon: Stack,
      label: "All feedback",
    },
    {
      adminOnly: true,
      href: `${base}/feedback/review`,
      icon: Tray,
      label: "Review",
    },
    { href: `${base}/feedback/duplicates`, icon: Copy, label: "Duplicates" },
  ];
}

function changelogItems(base: string): NavItem[] {
  const changelog = `${base}/changelog`;
  return [
    { href: changelog, icon: Scroll, label: "Releases" },
    {
      adminOnly: true,
      href: `${changelog}/email-analytics`,
      icon: ChartBar,
      label: "Email analytics",
    },
    { href: `${changelog}?tab=widget`, icon: Code, label: "Embed" },
    {
      adminOnly: true,
      href: `${changelog}?tab=settings`,
      icon: Gear,
      label: "Settings",
    },
  ];
}

function surveyItems(base: string): NavItem[] {
  const surveys = `${base}/surveys`;
  return [
    { href: surveys, icon: ClipboardText, label: "All surveys" },
    { href: `${surveys}?status=draft`, icon: NotePencil, label: "Drafts" },
    { href: `${surveys}?status=active`, icon: PlayCircle, label: "Active" },
    { href: `${surveys}?status=paused`, icon: PauseCircle, label: "Paused" },
    { href: `${surveys}?status=closed`, icon: XCircle, label: "Closed" },
  ];
}

function intelligenceItems(base: string): NavItem[] {
  const intelligence = `${base}/intelligence`;
  return [
    { href: intelligence, icon: Lightbulb, label: "Insights" },
    { href: `${intelligence}?tab=community`, icon: Hash, label: "Community" },
    {
      href: `${intelligence}?tab=competitors`,
      icon: Users,
      label: "Competitors",
    },
    { href: `${intelligence}?tab=settings`, icon: Gear, label: "Settings" },
  ];
}

function workspaceSections(base: string, unread?: number): NavSection[] {
  return [
    {
      ...sectionOf("Feedback", Chat, feedbackItems(base)),
      childRoutePrefix: `${base}/feedback`,
    },
    sectionOf("Changelog", FileText, changelogItems(base)),
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
      ...sectionOf("Surveys", ClipboardText, surveyItems(base)),
      adminOnly: true,
    },
    {
      ...sectionOf("Intelligence", Binoculars, intelligenceItems(base)),
      adminOnly: true,
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

function settingsItems(base: string, deleted?: number): NavItem[] {
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

function sectionOf(label: string, icon: Icon, items: NavItem[]): NavSection {
  return { href: items[0].href, icon, items, label };
}

const pathOf = (href: string) => href.split("?")[0];

function matchesQuery(href: string, search: URLSearchParams) {
  const query = new URLSearchParams(href.split("?")[1]);
  return [...query].every(([key, value]) => search.get(key) === value);
}

export function isNavItemActive(
  { href, childRoutePrefix = pathOf(href) }: NavItem,
  pathname: string
) {
  return (
    pathname === pathOf(href) || pathname.startsWith(`${childRoutePrefix}/`)
  );
}

export function isSectionActive(
  section: NavItem & { items?: NavItem[] },
  pathname: string
) {
  return [section, ...(section.items ?? [])].some((item) =>
    isNavItemActive(item, pathname)
  );
}

export function activeNavItem<Item extends NavItem>(
  items: Item[],
  pathname: string,
  search = new URLSearchParams()
) {
  return items
    .filter(
      (item) =>
        isSectionActive(item, pathname) && matchesQuery(item.href, search)
    )
    .sort((first, second) => second.href.length - first.href.length)[0];
}

export function orgSections({
  counts = {},
  isAdmin,
  slug,
}: OrgSectionsOptions): NavSection[] {
  const base = `/dashboard/${slug}`;
  const visible = (item: NavItem) => isAdmin || !item.adminOnly;
  const sections = [
    ...workspaceSections(base, counts.unread),
    {
      ...sectionOf("Developer", TerminalWindow, developerItems(base)),
      manage: true,
    },
    {
      ...sectionOf("Settings", Gear, settingsItems(base, counts.deleted)),
      manage: true,
    },
  ];
  return sections.filter(visible).map((section) => ({
    ...section,
    items: section.items?.filter(visible),
  }));
}
