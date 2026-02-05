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
} from "@/components/ui/typography";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
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
    p: ({ children }) => (
      <Text className="mb-4 text-muted-foreground" variant="bodyLarge">
        {children}
      </Text>
    ),
    a: ({ href, children }) => {
      const isExternal = href?.startsWith("http");
      if (isExternal) {
        return (
          <a
            className="text-olive-600 underline underline-offset-4 transition-colors hover:text-olive-700 dark:text-olive-400 dark:hover:text-olive-300"
            href={href}
            rel="noopener noreferrer"
            target="_blank"
          >
            {children}
          </a>
        );
      }
      return (
        <Link
          className="text-olive-600 underline underline-offset-4 transition-colors hover:text-olive-700 dark:text-olive-400 dark:hover:text-olive-300"
          href={href ?? "#"}
        >
          {children}
        </Link>
      );
    },
    ul: ({ children }) => (
      <ul className="my-4 ml-6 list-disc space-y-2 text-muted-foreground">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="my-4 ml-6 list-decimal space-y-2 text-muted-foreground">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="text-base leading-relaxed">{children}</li>
    ),
    blockquote: ({ children }) => <Blockquote>{children}</Blockquote>,
    code: ({ children }) => <InlineCode>{children}</InlineCode>,
    pre: ({ children }) => (
      <pre className="my-4 overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
        {children}
      </pre>
    ),
    img: ({ src, alt }) => (
      <Image
        alt={alt ?? ""}
        className="my-6 rounded-lg"
        height={400}
        src={src ?? ""}
        width={800}
      />
    ),
    hr: () => <hr className="my-8 border-border" />,
    table: ({ children }) => (
      <div className="my-6 overflow-x-auto">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border border-border bg-muted px-4 py-2 text-left font-semibold">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-border px-4 py-2">{children}</td>
    ),
    ...components,
  };
}
