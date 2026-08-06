import Link from "next/link";

const PRODUCT_LINKS = [
  { href: "https://www.reflet.app/reflet", label: "Feedback Board" },
  { href: "https://www.reflet.app/reflet?view=roadmap", label: "Roadmap" },
  {
    href: "https://www.reflet.app/reflet?view=milestones",
    label: "Milestones",
  },
  {
    href: "https://www.reflet.app/reflet?view=changelog",
    label: "Changelog",
  },
  { href: "https://www.reflet.app/reflet?view=support", label: "Support" },
] as const;

const RESOURCE_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/integrations", label: "Integrations" },
  { href: "/security", label: "Security" },
  { href: "/blog", label: "Blog" },
  { href: "/docs", label: "Docs" },
] as const;

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
] as const;

export default function Footer() {
  return (
    <footer className="border-border border-t bg-background py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <span className="font-serif text-foreground text-xl tracking-tight">
              Reflet.
            </span>
          </div>

          <div>
            <p className="mb-3 font-semibold text-foreground text-sm">
              Product
            </p>
            <ul className="space-y-2">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    className="text-muted-foreground text-sm hover:text-foreground"
                    href={link.href}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-3 font-semibold text-foreground text-sm">
              Resources
            </p>
            <ul className="space-y-2">
              {RESOURCE_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    className="text-muted-foreground text-sm hover:text-foreground"
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  className="text-muted-foreground text-sm hover:text-foreground"
                  href="https://github.com/damien-schneider/reflet"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-3 font-semibold text-foreground text-sm">Legal</p>
            <ul className="space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    className="text-muted-foreground text-sm hover:text-foreground"
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-border border-t pt-8">
          <p className="text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} Damien Schneider EI. Open Source.
          </p>
        </div>
      </div>
    </footer>
  );
}
