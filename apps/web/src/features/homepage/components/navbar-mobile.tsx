import { Button } from "@ctrl-ui/react/ui/button";
import Link from "next/link";
import MobileMenuDialog from "./mobile-menu-dialog";

export default function NavbarMobile() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-border/60 border-b bg-background/70 px-4 backdrop-blur-xl md:hidden">
      <Link
        className="font-serif text-2xl text-foreground tracking-tight"
        href="/"
      >
        Reflet.
      </Link>
      <div className="flex items-center gap-1">
        <Link href="/dashboard" prefetch={true}>
          <Button size="xs" tone="primary" variant="solid">
            Get started
          </Button>
        </Link>
        <MobileMenuDialog />
      </div>
    </header>
  );
}
