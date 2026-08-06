import Link from "next/link";
import { Button } from "@/components/ui/button";
import MobileMenuDialog from "./mobile-menu-dialog";

export default function NavbarMobile() {
  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-border border-b bg-background/95 px-4 backdrop-blur-md md:hidden">
      <Link
        className="font-serif text-2xl text-foreground tracking-tight"
        href="/"
      >
        Reflet.
      </Link>
      <div className="flex items-center gap-1">
        <Link href="/dashboard" prefetch={true}>
          <Button size="sm">Get started</Button>
        </Link>
        <MobileMenuDialog />
      </div>
    </header>
  );
}
