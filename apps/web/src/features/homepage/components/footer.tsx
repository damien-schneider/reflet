import Link from "next/link";

import { RefletWordmark } from "@/components/reflet-mark";

const LINKS = [
  {
    external: true,
    href: "https://www.reflet.app/reflet",
    label: "Live board",
  },
  {
    external: true,
    href: "https://www.reflet.app/reflet?view=roadmap",
    label: "Roadmap",
  },
  {
    external: true,
    href: "https://www.reflet.app/reflet?view=changelog",
    label: "Changelog",
  },
  { external: false, href: "/docs", label: "Docs" },
  { external: false, href: "/integrations", label: "Integrations" },
  { external: false, href: "/security", label: "Security" },
  { external: false, href: "/blog", label: "Blog" },
  {
    external: true,
    href: "https://github.com/damien-schneider/reflet",
    label: "GitHub",
  },
  { external: false, href: "/privacy", label: "Privacy" },
  { external: false, href: "/terms", label: "Terms" },
] as const;

const LINK_CLASS =
  "inline-flex h-9 items-center text-[13px] text-muted-foreground transition-colors hover:text-foreground";

export default function Footer() {
  return (
    <footer className="waterline relative bg-background pt-20 pb-36 sm:pb-28">
      <div className="mx-auto flex max-w-220 flex-col gap-10 px-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <RefletWordmark />

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-1">
          {LINKS.map((link) =>
            link.external ? (
              <a
                className={LINK_CLASS}
                href={link.href}
                key={link.label}
                rel="noopener noreferrer"
                target="_blank"
              >
                {link.label}
              </a>
            ) : (
              <Link className={LINK_CLASS} href={link.href} key={link.label}>
                {link.label}
              </Link>
            )
          )}
        </nav>

        <p className="text-[13px] text-muted-foreground">
          &copy; {new Date().getFullYear()} Damien Schneider EI
        </p>
      </div>
    </footer>
  );
}
