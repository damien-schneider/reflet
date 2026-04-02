"use client";

import { GithubLogo, List, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const REFLET_BASE = "https://www.reflet.app/reflet";

const DEMO_LINKS = [
  { label: "Feedback Board", href: REFLET_BASE },
  { label: "Roadmap", href: `${REFLET_BASE}?view=roadmap` },
  { label: "Milestones", href: `${REFLET_BASE}?view=milestones` },
  { label: "Changelog", href: `${REFLET_BASE}/changelog` },
  { label: "Support", href: `${REFLET_BASE}/support` },
] as const;

const RESOURCE_LINKS = [
  { label: "Documentation", href: "/docs", internal: true },
  { label: "Blog", href: "/blog", internal: true },
] as const;

const menuLinkClassName =
  "block rounded-lg px-3 py-3 font-medium text-foreground text-lg transition-colors hover:bg-muted";

export default function MobileMenuDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        aria-label="Open menu"
        className="flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium text-foreground text-sm transition-colors hover:bg-muted"
        onClick={open}
        type="button"
      >
        <List className="size-5" />
        Menu
      </button>

      <dialog
        className="m-0 h-full max-h-full w-full max-w-full animate-[dialog-in_0.2s_ease-out] border-none bg-background p-0 backdrop:bg-transparent md:hidden"
        ref={dialogRef}
      >
        <div className="flex h-full animate-[dialog-content-in_0.3s_cubic-bezier(0.22,1,0.36,1)] flex-col overflow-y-auto px-6 pt-6 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Link
              className="font-serif text-2xl text-foreground tracking-tight"
              href="/"
              onClick={close}
            >
              Reflet.
            </Link>
            <button
              aria-label="Close menu"
              className="rounded-xl p-2.5 text-foreground transition-colors hover:bg-muted"
              onClick={close}
              type="button"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="mt-10 flex flex-1 flex-col gap-8">
            {/* Main links */}
            <div className="flex flex-col gap-1">
              <Link
                className={menuLinkClassName}
                href="/pricing"
                onClick={close}
              >
                Pricing
              </Link>
              <Link
                className={menuLinkClassName}
                href="/features"
                onClick={close}
              >
                Features
              </Link>
            </div>

            {/* Demo section */}
            <div>
              <p className="mb-2 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Demo
              </p>
              <div className="flex flex-col gap-1">
                {DEMO_LINKS.map((link) => (
                  <a
                    className={menuLinkClassName}
                    href={link.href}
                    key={link.label}
                    onClick={close}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Resources section */}
            <div>
              <p className="mb-2 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Resources
              </p>
              <div className="flex flex-col gap-1">
                {RESOURCE_LINKS.map((link) => (
                  <Link
                    className={menuLinkClassName}
                    href={link.href}
                    key={link.label}
                    onClick={close}
                  >
                    {link.label}
                  </Link>
                ))}
                <a
                  className={cn(menuLinkClassName, "flex items-center gap-2.5")}
                  href="https://github.com/damien-schneider/reflet"
                  onClick={close}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <GithubLogo className="size-5" />
                  GitHub
                </a>
              </div>
            </div>
          </nav>

          {/* Footer actions */}
          <div className="flex flex-col gap-3 border-border border-t pt-6">
            <Link
              className="rounded-lg py-3 text-center font-medium text-foreground text-sm transition-colors hover:bg-muted"
              href="/dashboard"
              onClick={close}
              prefetch={true}
            >
              Log in
            </Link>
            <Link href="/dashboard" onClick={close} prefetch={true}>
              <Button className="w-full" size="lg">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </dialog>
    </>
  );
}
