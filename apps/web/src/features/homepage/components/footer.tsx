import Link from "next/link";

const PRODUCT_LINKS = [
  {
    label: "Feedback Board",
    href: "https://www.reflet.app/reflet",
  },
  {
    label: "Roadmap",
    href: "https://www.reflet.app/reflet?view=roadmap",
  },
  {
    label: "Milestones",
    href: "https://www.reflet.app/reflet?view=milestones",
  },
  {
    label: "Changelog",
    href: "https://www.reflet.app/reflet?view=changelog",
  },
  {
    label: "Support",
    href: "https://www.reflet.app/reflet?view=support",
  },
] as const;

const COMPANY_LINKS = [
  { label: "Features", href: "/#features", internal: true },
  { label: "Pricing", href: "/pricing", internal: true },
  { label: "Blog", href: "/blog", internal: true },
  {
    label: "GitHub",
    href: "https://github.com/damien-schneider/reflet",
  },
] as const;

const LEGAL_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Cookies", href: "/cookies" },
] as const;

export default function Footer() {
  return (
    <footer className="border-border border-t bg-background py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <span className="font-serif text-foreground text-xl tracking-tight">
              Reflet.
            </span>
            <p className="mt-3 text-muted-foreground text-sm">
              A modern product feedback and roadmap platform.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-3 font-semibold text-foreground text-sm">
              Product
            </h4>
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

          {/* Company */}
          <div>
            <h4 className="mb-3 font-semibold text-foreground text-sm">
              Company
            </h4>
            <ul className="space-y-2">
              {COMPANY_LINKS.map((link) =>
                "internal" in link && link.internal ? (
                  <li key={link.label}>
                    {link.href.startsWith("/") &&
                    !link.href.startsWith("/#") ? (
                      <Link
                        className="text-muted-foreground text-sm hover:text-foreground"
                        href={link.href}
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        className="text-muted-foreground text-sm hover:text-foreground"
                        href={link.href}
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ) : (
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
                )
              )}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-3 font-semibold text-foreground text-sm">
              Legal
            </h4>
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

        {/* Copyright */}
        <div className="mt-12 border-border border-t pt-8">
          <p className="text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} Reflet Inc. Open Source.
          </p>
        </div>
      </div>
    </footer>
  );
}
