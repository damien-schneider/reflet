import Link from "next/link";

import { RefletWordmark } from "@/components/reflet-mark";
import { Button } from "@/components/ui/button";

import MobileMenuDialog from "./mobile-menu-dialog";

export default function NavbarMobile() {
  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-border/70 border-b bg-background/85 px-5 backdrop-blur-xl md:hidden">
      <Link aria-label="Reflet home" href="/">
        <RefletWordmark />
      </Link>
      <div className="flex items-center gap-1">
        <Button
          className="h-8 rounded-full px-3.5 text-[13px]"
          render={<Link href="/dashboard" prefetch={true} />}
          size="sm"
        >
          Get started
        </Button>
        <MobileMenuDialog />
      </div>
    </header>
  );
}
