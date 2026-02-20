"use client";

import { usePathname } from "next/navigation";
import { DocsSidebar } from "@/components/docs/docs-sidebar";

export function DocsSidebarWrapper() {
  const pathname = usePathname();
  return <DocsSidebar pathname={pathname} />;
}
