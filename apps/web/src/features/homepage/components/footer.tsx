import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-border border-t bg-background py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 md:flex-row md:gap-8">
          <span className="font-serif text-foreground text-xl tracking-tight">
            Reflet.
          </span>
          <div className="flex flex-wrap justify-center gap-6 text-muted-foreground text-sm">
            <Link className="hover:text-foreground" href="/pricing">
              Pricing
            </Link>
            <a className="hover:text-foreground" href="/#features">
              Features
            </a>
            <a
              className="hover:text-foreground"
              href="https://github.com/damien-schneider/reflet"
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub
            </a>
          </div>
        </div>
        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-8">
          <div className="flex flex-wrap justify-center gap-4 text-muted-foreground text-sm">
            <Link className="hover:text-foreground" href="/privacy">
              Privacy
            </Link>
            <Link className="hover:text-foreground" href="/terms">
              Terms
            </Link>
            <Link className="hover:text-foreground" href="/cookies">
              Cookies
            </Link>
          </div>
          <div className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Reflet Inc. Open Source.
          </div>
        </div>
      </div>
    </footer>
  );
}
