"use client";

import { List, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useRef } from "react";

import { RefletWordmark } from "@/components/reflet-mark";
import { Button } from "@/components/ui/button";
import { useThemeToggle } from "@/components/ui/theme-toggle";

const menuLinkClassName =
  "block rounded-lg py-3 font-medium text-[15px] text-foreground transition-colors hover:text-muted-foreground";

export default function MobileMenuDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { cycleTheme, label: themeLabel } = useThemeToggle();

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
        <div className="flex h-full flex-col overflow-y-auto px-5 pb-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" onClick={close}>
              <RefletWordmark />
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
              Docs
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
              className={menuLinkClassName}
              href="https://github.com/damien-schneider/reflet"
              onClick={close}
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub
            </a>
          </nav>

          <div className="flex flex-col gap-3 border-border border-t pt-6">
            <button
              className={`${menuLinkClassName} text-left`}
              onClick={cycleTheme}
              type="button"
            >
              {themeLabel} theme
            </button>
            <Link
              className={menuLinkClassName}
              href="/dashboard"
              onClick={close}
              prefetch={true}
            >
              Log in
            </Link>
            <Button
              className="w-full text-[15px]"
              render={
                <Link href="/dashboard" onClick={close} prefetch={true} />
              }
              size="lg"
            >
              Get started
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
