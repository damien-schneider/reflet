import Link from "next/link";
import { Button } from "@/components/ui/button";
import MobileMenuDialog from "./mobile-menu-dialog";

export default function NavbarMobile() {
  return (
    <div className="fixed inset-x-4 bottom-4 z-50 flex items-center justify-between rounded-2xl border border-border bg-background/95 px-2 py-2 shadow-lg backdrop-blur-md md:hidden">
      <MobileMenuDialog />
      <Link href="/dashboard" prefetch={true}>
        <Button size="sm">Get started</Button>
      </Link>
    </div>
  );
}
