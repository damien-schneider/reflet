export default function Footer() {
  return (
    <footer className="border-border border-t bg-background py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:px-6 md:flex-row lg:px-8">
        <div className="flex items-center gap-8">
          <span className="font-serif text-foreground text-xl tracking-tight">
            Reflect.
          </span>
          <div className="hidden gap-6 text-muted-foreground text-sm md:flex">
            <a className="hover:text-foreground" href="#pricing">
              Pricing
            </a>
            <a className="hover:text-foreground" href="#features">
              Features
            </a>
            <a
              className="hover:text-foreground"
              href="https://github.com/damien-schneider/reflect-os"
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub
            </a>
          </div>
        </div>
        <div className="text-muted-foreground text-sm">
          © {new Date().getFullYear()} Reflect Inc. Open Source.
        </div>
      </div>
    </footer>
  );
}
