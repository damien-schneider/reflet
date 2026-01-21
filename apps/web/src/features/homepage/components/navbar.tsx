import { List, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const scrollToSection = (targetId: string) => {
    setIsOpen(false);
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-border border-b bg-background/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <div className="flex flex-shrink-0 items-center">
              <Link
                className="font-serif text-2xl text-foreground tracking-tight"
                href="/"
              >
                Reflet.
              </Link>
            </div>

            {/* Links */}
            <div className="hidden items-center space-x-8 md:flex">
              <button
                className="font-medium text-foreground text-sm transition-colors hover:text-muted-foreground"
                onClick={() => scrollToSection("pricing")}
                type="button"
              >
                Pricing
              </button>
              <button
                className="font-medium text-foreground text-sm transition-colors hover:text-muted-foreground"
                onClick={() => scrollToSection("features")}
                type="button"
              >
                Features
              </button>
              <a
                className="font-medium text-foreground text-sm transition-colors hover:text-muted-foreground"
                href="https://github.com/damien-schneider/reflet"
                rel="noopener noreferrer"
                target="_blank"
              >
                GitHub
              </a>
            </div>
          </div>

          {/* Right Actions */}
          <div className="hidden items-center space-x-6 md:flex">
            <Link
              className="font-medium text-foreground text-sm hover:text-muted-foreground"
              href="/dashboard"
            >
              Log in
            </Link>
            <Link href="/dashboard">
              <Button size="default" variant="default">
                Get started
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              aria-label="Toggle menu"
              className="text-foreground hover:text-muted-foreground focus:outline-none"
              onClick={() => setIsOpen(!isOpen)}
              type="button"
            >
              {isOpen ? <X size={24} /> : <List size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="border-border border-b bg-card md:hidden">
          <div className="space-y-1 px-2 pt-2 pb-3 sm:px-3">
            <button
              className="block w-full rounded-md px-3 py-2 text-left font-medium text-base text-foreground hover:bg-muted"
              onClick={() => scrollToSection("pricing")}
              type="button"
            >
              Pricing
            </button>
            <button
              className="block w-full rounded-md px-3 py-2 text-left font-medium text-base text-foreground hover:bg-muted"
              onClick={() => scrollToSection("features")}
              type="button"
            >
              Features
            </button>
            <a
              className="block rounded-md px-3 py-2 font-medium text-base text-foreground hover:bg-muted"
              href="https://github.com/damien-schneider/reflet"
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub
            </a>
            <Link
              className="block rounded-md px-3 py-2 font-medium text-base text-foreground hover:bg-muted"
              href="/dashboard"
              onClick={() => setIsOpen(false)}
            >
              Log in
            </Link>
            <div className="px-3 py-2">
              <Link href="/dashboard" onClick={() => setIsOpen(false)}>
                <Button className="w-full" size="default" variant="default">
                  Get started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
