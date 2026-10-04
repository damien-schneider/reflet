import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import type { NavItem } from "@/features/dashboard/components/navigation/nav-group";
import type { NavSection } from "@/features/dashboard/components/navigation/org-sections";
import { SectionNavPanel } from "@/features/dashboard/components/section-panel";
import { getTagSwatchClass } from "@/lib/tag-colors";

interface BoardFilterOption {
  _id: string;
  color?: string;
  name: string;
}

function filterItems(
  boardHref: string,
  param: "status" | "tags",
  options: BoardFilterOption[] = []
): NavItem[] {
  return options.map(({ _id, color = "default", name }) => ({
    href: `${boardHref}?${param}=${_id}`,
    label: name,
    swatchClassName: getTagSwatchClass(color),
  }));
}

export function FeedbackSectionPanel({
  organizationId,
  pathname,
  section,
}: {
  organizationId: Id<"organizations"> | undefined;
  pathname: string;
  section: NavSection & { items: NavItem[] };
}) {
  const scope = organizationId ? { organizationId } : "skip";
  const statuses = useQuery(api.organizations.statuses.list, scope);
  const tags = useQuery(api.feedback.tags.list, scope);
  const groups = [
    { items: section.items },
    { items: filterItems(section.href, "status", statuses), label: "Status" },
    { items: filterItems(section.href, "tags", tags), label: "Tags" },
  ];
  return (
    <SectionNavPanel
      groups={groups.filter((group) => group.items.length > 0)}
      pathname={pathname}
      title={section.label}
    />
  );
}
