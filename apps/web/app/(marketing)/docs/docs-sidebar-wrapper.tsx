"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@ctrl-ui/react/ui/sheet";
import { List } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { DocsSidebar } from "@/components/docs/docs-sidebar";

export function DocsSidebarWrapper() {
  const pathname = usePathname();
  return <DocsSidebar pathname={pathname} />;
}

export function DocsMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        aria-expanded={open}
        aria-haspopup="dialog"
        className="md:hidden"
        onClick={() => setOpen(true)}
        size="sm"
        variant="ghost"
      >
        <List aria-hidden className="size-4" />
        Menu
      </Button>
      <Sheet onOpenChange={setOpen} open={open}>
        <SheetContent className="overflow-y-auto" side="left">
          <SheetHeader>
            <SheetTitle>Documentation</SheetTitle>
          </SheetHeader>
          <DocsSidebar onNavigate={() => setOpen(false)} pathname={pathname} />
        </SheetContent>
      </Sheet>
    </>
  );
}
