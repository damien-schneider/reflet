import { GithubLogo } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const navLinkClassName =
  "font-medium text-foreground/75 text-sm transition-colors hover:text-foreground";

export default function NavbarDesktop() {
  return (
    <nav className="sticky top-0 z-50 hidden border-border border-b bg-background/95 backdrop-blur-md md:block">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link
            className="font-serif text-2xl text-foreground tracking-tight transition-opacity hover:opacity-70"
            href="/"
          >
            Reflet.
          </Link>
          <div className="flex items-center gap-6">
            <Link className={navLinkClassName} href="/features">
              Features
            </Link>
            <Link className={navLinkClassName} href="/pricing">
              Pricing
            </Link>
            <Link className={navLinkClassName} href="/docs">
              Docs
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a
            aria-label="GitHub repository"
            className="text-foreground/75 transition-colors hover:text-foreground"
            href="https://github.com/damien-schneider/reflet"
            rel="noopener noreferrer"
            target="_blank"
          >
            <GithubLogo className="size-5" />
          </a>
          <Link className={navLinkClassName} href="/dashboard" prefetch={true}>
            Log in
          </Link>
          <Link href="/dashboard" prefetch={true}>
            <Button size="default">Get started</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
