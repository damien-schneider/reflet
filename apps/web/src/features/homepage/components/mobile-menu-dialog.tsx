"use client";

import { GithubLogo, List, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useRef } from "react";

import { Button } from "@/components/ui/button";

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
        className="rounded-lg p-2.5 text-foreground transition-colors hover:bg-muted"
        onClick={open}
        type="button"
      >
        <List className="size-5" />
      </button>

      <dialog
        aria-label="Navigation"
        className="m-0 h-full max-h-full w-full max-w-full border-none bg-background p-0 backdrop:bg-transparent md:hidden"
        ref={dialogRef}
      >
        <div className="flex h-full flex-col overflow-y-auto px-6 pt-6 pb-8">
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
              className="rounded-lg p-2.5 text-foreground transition-colors hover:bg-muted"
              onClick={close}
              type="button"
            >
              <X className="size-5" />
            </button>
          </div>

          <nav className="mt-8 flex flex-1 flex-col gap-1">
            <Link
              className={menuLinkClassName}
              href="/features"
              onClick={close}
            >
              Features
            </Link>
            <Link className={menuLinkClassName} href="/pricing" onClick={close}>
              Pricing
            </Link>
            <Link
              className={menuLinkClassName}
              href="/integrations"
              onClick={close}
            >
              Integrations
            </Link>
            <Link className={menuLinkClassName} href="/docs" onClick={close}>
              Documentation
            </Link>
            <Link className={menuLinkClassName} href="/blog" onClick={close}>
              Blog
            </Link>
            <a
              className={menuLinkClassName}
              href="https://www.reflet.app/reflet"
              onClick={close}
              rel="noopener noreferrer"
              target="_blank"
            >
              Live demo
            </a>
            <a
              className={`${menuLinkClassName} flex items-center gap-2.5`}
              href="https://github.com/damien-schneider/reflet"
              onClick={close}
              rel="noopener noreferrer"
              target="_blank"
            >
              <GithubLogo className="size-5" />
              GitHub
            </a>
          </nav>

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
