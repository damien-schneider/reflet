import { Check, Lightning, MegaphoneSimple } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { H3 } from "@/components/ui/typography";

const RELEASES = [
  {
    id: "r1",
    version: "v2.4.0",
    title: "Public API & Webhooks",
    color: "blue" as const,
    shipped: ["REST API with CRUD", "Webhook events"],
  },
  {
    id: "r2",
    version: "v2.3.0",
    title: "AI-Powered Triage",
    color: "purple" as const,
    shipped: ["Auto-categorize feedback", "Duplicate detection"],
  },
] as const;

export function ChangelogCard() {
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-500 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-center justify-between border-border border-b px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
            <MegaphoneSimple size={18} weight="fill" />
          </div>
          <H3 className="text-sm" variant="cardBold">
            Changelog
          </H3>
        </div>
      </div>

      <div className="flex-1 space-y-4 p-4">
        {RELEASES.map((release) => (
          <div className="relative" key={release.id}>
            {/* Version header */}
            <div className="mb-2 flex items-center gap-2">
              <Badge color={release.color}>
                <span className="font-mono">{release.version}</span>
              </Badge>
            </div>

            <p className="mb-2 font-semibold text-foreground text-sm">
              {release.title}
            </p>

            {/* Shipped features */}
            <div className="space-y-1.5">
              {release.shipped.map((item) => (
                <div className="flex items-center gap-2" key={item}>
                  <Check
                    className="shrink-0 text-olive-500"
                    size={12}
                    weight="bold"
                  />
                  <span className="text-muted-foreground text-xs">{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Subscriber notification */}
        <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 dark:bg-primary/10">
          <Lightning className="text-primary" size={12} weight="fill" />
          <span className="font-medium text-[10px] text-primary">
            142 subscribers notified
          </span>
        </div>
      </div>
    </div>
  );
}
