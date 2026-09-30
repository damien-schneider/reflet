import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

interface DocsCard {
  description: string;
  href: string;
  title: string;
}

interface DocsCardGridProps {
  /** Heading level of each card title, so it nests under the surrounding heading. */
  headingLevel: "h2" | "h3";
  items: readonly DocsCard[];
}

function DocsCardGrid({ headingLevel: Heading, items }: DocsCardGridProps) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            className="group flex h-full flex-col gap-1 rounded-xl border border-border bg-card p-5 hover:border-foreground/20"
            href={item.href}
          >
            <Heading className="flex items-center justify-between gap-2 font-semibold text-foreground text-heading-4">
              {item.title}
              <ArrowRight
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground"
              />
            </Heading>
            <p className="text-body text-muted-foreground">
              {item.description}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export type { DocsCard };
export { DocsCardGrid };
