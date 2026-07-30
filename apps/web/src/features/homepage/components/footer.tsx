import Link from "next/link";

const PRODUCT_LINKS = [
  {
    href: "https://www.reflet.app/reflet",
    label: "Feedback Board",
  },
  {
    href: "https://www.reflet.app/reflet?view=roadmap",
    label: "Roadmap",
  },
  {
    href: "https://www.reflet.app/reflet?view=milestones",
    label: "Milestones",
  },
  {
    href: "https://www.reflet.app/reflet?view=changelog",
    label: "Changelog",
  },
  {
    href: "https://www.reflet.app/reflet?view=support",
    label: "Support",
  },
] as const;

const COMPANY_LINKS = [
  { href: "/features", internal: true, label: "Features" },
  { href: "/pricing", internal: true, label: "Pricing" },
  { href: "/integrations", internal: true, label: "Integrations" },
  { href: "/security", internal: true, label: "Security" },
  { href: "/blog", internal: true, label: "Blog" },
  { href: "/docs", internal: true, label: "Docs" },
  {
    href: "https://github.com/damien-schneider/reflet",
    label: "GitHub",
  },
] as const;

const COMPARE_LINKS = [
  { href: "/blog/reflet-vs-canny", label: "Reflet vs Canny" },
  { href: "/blog/reflet-vs-featurebase", label: "Reflet vs Featurebase" },
  { href: "/blog/reflet-vs-productboard", label: "Reflet vs Productboard" },
  { href: "/blog/reflet-vs-uservoice", label: "Reflet vs UserVoice" },
  { href: "/blog/reflet-vs-fider", label: "Reflet vs Fider" },
  { href: "/blog/reflet-vs-nolt", label: "Reflet vs Nolt" },
  { href: "/blog/reflet-vs-frill", label: "Reflet vs Frill" },
  { href: "/blog/reflet-vs-upvoty", label: "Reflet vs Upvoty" },
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
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-5">
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

          {/* Company */}
          <div>
            <p className="mb-3 font-semibold text-foreground text-sm">
              Company
            </p>
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

          {/* Compare */}
          <div>
            <p className="mb-3 font-semibold text-foreground text-sm">
              Compare
            </p>
            <ul className="space-y-2">
              {COMPARE_LINKS.map((link) => (
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

          {/* Legal */}
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

        {/* Copyright */}
        <div className="mt-12 border-border border-t pt-8">
          <p className="text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} Damien Schneider EI. Open Source.
          </p>
        </div>
      </div>
    </footer>
  );
}
