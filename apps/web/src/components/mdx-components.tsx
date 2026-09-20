import { Table, TableCell, TableHead } from "@ctrl-ui/react/ui/table";
import type { MDXComponents } from "mdx/types";
import Image from "next/image";
import Link from "next/link";

import {
  Blockquote,
  H1,
  H2,
  H3,
  InlineCode,
  Text,
  textVariants,
} from "@/components/ui/typography";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: ({ href, children }) => {
      const isExternal = href?.startsWith("http");
      if (isExternal) {
        return (
          <a
            className={textVariants({ variant: "link" })}
            href={href}
            rel="noopener noreferrer"
            target="_blank"
          >
            {children}
          </a>
        );
      }
      return (
        <Link className={textVariants({ variant: "link" })} href={href ?? "#"}>
          {children}
        </Link>
      );
    },
    blockquote: ({ children }) => <Blockquote>{children}</Blockquote>,
    code: ({ children }) => <InlineCode>{children}</InlineCode>,
    h1: ({ children }) => (
      <H1 className="mt-10 mb-6" variant="page">
        {children}
      </H1>
    ),
    h2: ({ children }) => (
      <H2 className="mt-8 mb-4" variant="section">
        {children}
      </H2>
    ),
    h3: ({ children }) => (
      <H3 className="mt-6 mb-3" variant="default">
        {children}
      </H3>
    ),
    hr: () => <hr className="my-8 border-border" />,
    img: ({ src, alt }) => (
      <Image
        alt={alt ?? ""}
        className="my-6 rounded-lg outline outline-1 outline-black/10 -outline-offset-1 dark:outline-white/10"
        height={400}
        src={src ?? ""}
        width={800}
      />
    ),
    li: ({ children }) => (
      <li className="text-base leading-relaxed">{children}</li>
    ),
    ol: ({ children }) => (
      <ol className="my-4 ml-6 list-decimal space-y-2 text-muted-foreground">
        {children}
      </ol>
    ),
    p: ({ children }) => (
      <Text className="mb-4 text-muted-foreground" variant="bodyLarge">
        {children}
      </Text>
    ),
    pre: ({ children }) => (
      <pre className="my-4 overflow-x-auto rounded-lg bg-muted p-4 font-mono text-muted-foreground text-sm">
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div className="my-6 overflow-x-auto">
        <Table className="w-full border-collapse text-sm">{children}</Table>
      </div>
    ),
    td: ({ children }) => (
      <TableCell className="border border-border px-4 py-2">
        {children}
      </TableCell>
    ),
    th: ({ children }) => (
      <TableHead className="border border-border bg-muted px-4 py-2 text-left font-semibold">
        {children}
      </TableHead>
    ),
    ul: ({ children }) => (
      <ul className="my-4 ml-6 list-disc space-y-2 text-muted-foreground">
        {children}
      </ul>
    ),
    ...components,
  };
}
