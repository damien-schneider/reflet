import { Table, TableCell, TableHead } from "@ctrl-ui/react/ui/table";
import type { MDXComponents } from "mdx/types";
import Image from "next/image";
import Link from "next/link";

import { HeadingAnchor } from "@/components/heading-anchor";
import { Blockquote, InlineCode } from "@/components/ui/typography";
import { headingSlug } from "@/lib/heading-slug";

const linkClassName =
  "text-foreground underline decoration-from-font underline-offset-4 decoration-muted-foreground hover:decoration-foreground";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: ({ href, children }) => {
      const isExternal = href?.startsWith("http");
      if (isExternal) {
        return (
          <a
            className={linkClassName}
            href={href}
            rel="noopener noreferrer"
            target="_blank"
          >
            {children}
          </a>
        );
      }
      return (
        <Link className={linkClassName} href={href ?? "#"}>
          {children}
        </Link>
      );
    },
    blockquote: ({ children }) => <Blockquote>{children}</Blockquote>,
    code: ({ children, className }) =>
      className ? (
        <code className={className}>{children}</code>
      ) : (
        <InlineCode>{children}</InlineCode>
      ),
    h1: ({ children }) => (
      <h1 className="mt-12 mb-6 text-balance text-display">{children}</h1>
    ),
    h2: ({ children }) => {
      const id = headingSlug(children);
      return (
        <h2
          className="mt-14 mb-4 scroll-mt-24 text-balance text-heading-1 tracking-[-0.025em]"
          id={id}
        >
          <HeadingAnchor id={id}>{children}</HeadingAnchor>
        </h2>
      );
    },
    h3: ({ children }) => {
      const id = headingSlug(children);
      return (
        <h3
          className="mt-10 mb-3 scroll-mt-24 text-balance text-heading-3"
          id={id}
        >
          <HeadingAnchor id={id}>{children}</HeadingAnchor>
        </h3>
      );
    },
    hr: () => <hr className="my-12 border-(--marketing-hairline)" />,
    img: ({ src, alt }) => (
      <Image
        alt={alt ?? ""}
        className="my-8 rounded-lg outline outline-1 outline-black/10 -outline-offset-1 dark:outline-white/10"
        height={400}
        src={src ?? ""}
        width={800}
      />
    ),
    li: ({ children }) => <li className="ps-1">{children}</li>,
    ol: ({ children }) => (
      <ol className="my-5 list-decimal space-y-2 ps-6 text-body-lg text-muted-foreground leading-relaxed marker:tabular-nums">
        {children}
      </ol>
    ),
    p: ({ children }) => (
      <p className="mb-5 text-body-lg text-muted-foreground leading-relaxed">
        {children}
      </p>
    ),
    pre: ({ children }) => (
      <pre className="my-6 overflow-x-auto rounded-lg bg-muted p-4 font-mono text-body">
        {children}
      </pre>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    table: ({ children }) => (
      <div className="my-8 overflow-x-auto tabular-nums">
        <Table>{children}</Table>
      </div>
    ),
    td: ({ children }) => (
      <TableCell className="whitespace-normal">{children}</TableCell>
    ),
    th: ({ children }) => <TableHead>{children}</TableHead>,
    ul: ({ children }) => (
      <ul className="my-5 list-disc space-y-2 ps-6 text-body-lg text-muted-foreground leading-relaxed marker:text-muted-foreground">
        {children}
      </ul>
    ),
    ...components,
  };
}
