"use client";

import Link from "next/link";
import type * as React from "react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarList,
  SidebarListButton,
  SidebarListItem,
} from "@/components/ui/sidebar";

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string;
    url: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  }[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarList>
          {items.map((item) => (
            <SidebarListItem key={item.title}>
              <SidebarListButton
                render={(props: React.ComponentProps<"a">) => (
                  <Link href={item.url} {...props}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                )}
                size="sm"
              />
            </SidebarListItem>
          ))}
        </SidebarList>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
