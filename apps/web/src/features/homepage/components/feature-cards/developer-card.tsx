import { CaretRight, Code, GithubLogo, Plugs } from "@phosphor-icons/react";
import Link from "next/link";

import { H3 } from "@/components/ui/typography";

export function DeveloperCard() {
  return (
    <Link
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-500 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
      href="/integrations"
    >
      <div className="flex items-center justify-between border-border border-b px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
            <Plugs size={18} weight="bold" />
          </div>
          <div>
            <H3 className="text-sm" variant="cardBold">
              Built for Developers
            </H3>
            <p className="text-[11px] text-muted-foreground">
              SDK, REST API, webhooks &amp; GitHub sync
            </p>
          </div>
        </div>
        <CaretRight
          className="text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary"
          size={16}
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:flex-row">
        {/* Code snippet */}
        <div className="flex-1 overflow-hidden rounded-xl border border-border bg-muted/30">
          <div className="flex items-center gap-1.5 border-border border-b px-3 py-1.5">
            <div className="h-2 w-2 rounded-full bg-red-400/50" />
            <div className="h-2 w-2 rounded-full bg-amber-400/50" />
            <div className="h-2 w-2 rounded-full bg-emerald-400/50" />
            <span className="ml-2 font-mono text-[10px] text-muted-foreground">
              app.tsx
            </span>
          </div>
          <pre className="overflow-x-auto p-3 font-mono text-[11px] leading-5">
            <span className="text-muted-foreground">
              {"// 3 lines to embed\n"}
            </span>
            <span className="text-primary">{"<RefletProvider"}</span>
            <span className="text-foreground">{' publicKey="pk_..."'}</span>
            <span className="text-primary">{">"}</span>
            {"\n  "}
            <span className="text-primary">{"<FeedbackButton />"}</span>
            {"\n"}
            <span className="text-primary">{"</RefletProvider>"}</span>
          </pre>
        </div>

        {/* Integrations */}
        <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
          {[
            { icon: GithubLogo, label: "GitHub" },
            { icon: Code, label: "API" },
            { icon: Plugs, label: "Hooks" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/30 px-4 py-2.5 transition-colors group-hover:border-primary/20 group-hover:bg-primary/5 sm:px-6"
                key={item.label}
              >
                <Icon className="text-primary" size={18} />
                <span className="font-medium text-[10px] text-muted-foreground">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Link>
  );
}
