import Link from "next/link";
import type { ReactNode } from "react";

export interface RuledEntry {
  description: string;
  external?: boolean;
  href?: string;
  id: string;
  marker?: string;
  title: string;
}

const ROW_CLASS = "block border-border border-t pt-4";
const LINK_ROW_CLASS = `group ${ROW_CLASS} transition-colors hover:border-olive-600 dark:hover:border-olive-300`;

function EntryBody({ entry }: { entry: RuledEntry }) {
  const titleClass = entry.href
    ? "font-semibold text-[15px] text-olive-700 group-hover:underline group-hover:underline-offset-4 dark:text-olive-300"
    : "font-semibold text-[15px] text-foreground";

  return (
    <>
      <span className="flex items-baseline gap-2.5">
        <span className={titleClass}>{entry.title}</span>
        {entry.marker && (
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.12em]">
            {entry.marker}
          </span>
        )}
      </span>
      <span className="mt-2 block text-[13px] text-muted-foreground leading-relaxed">
        {entry.description}
      </span>
    </>
  );
}

function EntryRow({ entry }: { entry: RuledEntry }): ReactNode {
  if (entry.external && entry.href) {
    return (
      <a
        className={LINK_ROW_CLASS}
        href={entry.href}
        rel="noopener noreferrer"
        target="_blank"
      >
        <EntryBody entry={entry} />
      </a>
    );
  }

  if (entry.href) {
    return (
      <Link className={LINK_ROW_CLASS} href={entry.href}>
        <EntryBody entry={entry} />
      </Link>
    );
  }

  return (
    <div className={ROW_CLASS}>
      <EntryBody entry={entry} />
    </div>
  );
}

export default function RuledList({ entries }: { entries: RuledEntry[] }) {
  return (
    <ul className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry) => (
        <li key={entry.id}>
          <EntryRow entry={entry} />
        </li>
      ))}
    </ul>
  );
}
