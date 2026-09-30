import { Hash } from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";

interface HeadingAnchorProps {
  children: ReactNode;
  id: string;
}

/** Heading content wrapped in a self-link, with a hash that shows on hover or focus. */
function HeadingAnchor({ children, id }: HeadingAnchorProps) {
  return (
    <a className="group inline-flex items-baseline gap-2" href={`#${id}`}>
      {children}
      <Hash
        aria-hidden
        className="size-[0.8em] shrink-0 self-center text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
      />
    </a>
  );
}

export { HeadingAnchor };
