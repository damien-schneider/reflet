import { CaretRight, GithubLogo, Lock } from "@phosphor-icons/react";

import { H3 } from "@/components/ui/typography";

export function OpenSourceCard() {
  return (
    <a
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-primary bg-primary transition-all duration-500 hover:shadow-lg hover:shadow-primary/30"
      href="https://github.com/damien-schneider/reflet"
      rel="noopener noreferrer"
      target="_blank"
    >
      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-primary-foreground/10 text-primary-foreground transition-transform duration-300 group-hover:scale-110">
            <Lock size={18} weight="fill" />
          </div>
          <H3
            className="mb-1.5 text-base text-primary-foreground"
            variant="cardBold"
          >
            Open Source
          </H3>
          <p className="text-primary-foreground/70 text-sm leading-relaxed">
            Audit our code, self-host, or contribute.
          </p>
        </div>
        <div className="mt-4 flex items-center gap-2 font-medium text-primary-foreground/90 text-sm transition-colors group-hover:text-primary-foreground">
          <GithubLogo size={16} />
          <span className="underline underline-offset-4">View on GitHub</span>
          <CaretRight
            className="transition-transform duration-300 group-hover:translate-x-1"
            size={14}
          />
        </div>
      </div>

      <div className="pointer-events-none absolute right-4 bottom-4 opacity-10">
        <svg
          aria-hidden="true"
          className="h-20 w-20"
          fill="none"
          role="img"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 100 100"
        >
          <title>Decorative git branch</title>
          <circle cx="20" cy="20" r="5" />
          <circle cx="80" cy="20" r="5" />
          <circle cx="50" cy="80" r="5" />
          <path d="M20 25 L20 60 Q20 75 35 75 L50 75" />
          <path d="M80 25 L80 60 Q80 75 65 75 L50 75" />
        </svg>
      </div>
    </a>
  );
}
