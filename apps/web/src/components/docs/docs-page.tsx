import { Alert, AlertDescription } from "@ctrl-ui/react/ui/alert";
import {
  PageBody,
  PageDescription,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { TableOfContents } from "@ctrl-ui/react/ui/table-of-contents";
import { Info } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ReactNode } from "react";

import { HeadingAnchor } from "@/components/heading-anchor";
import { textVariants } from "@/components/ui/typography-variants";
import { cn } from "@/lib/utils";

interface DocsSectionEntry {
  readonly id: string;
  readonly label: string;
  /** Heading level; 3 lists it under the previous section. Defaults to 2. */
  readonly level?: 3;
}

/** Page sections in reading order; drives the table of contents. */
type DocsSections = readonly DocsSectionEntry[];

const MIN_SECTIONS_FOR_TOC = 3;

interface DocsPageProps {
  children: ReactNode;
  description: ReactNode;
  sections?: DocsSections;
  title: string;
}

function DocsPage({ children, description, sections, title }: DocsPageProps) {
  const tocItems = (sections ?? []).map(({ id, label, level }) => ({
    href: `#${id}`,
    label,
    level,
  }));
  const toc =
    tocItems.length >= MIN_SECTIONS_FOR_TOC ? (
      <TableOfContents className="top-20" items={tocItems} />
    ) : undefined;

  return (
    <PageLayout scroll="page" width="prose">
      <PageHeader>
        <PageTitle>{title}</PageTitle>
        <PageDescription>{description}</PageDescription>
      </PageHeader>
      <PageBody aside={toc} contentClassName="flex flex-col gap-12">
        {children}
      </PageBody>
    </PageLayout>
  );
}

interface AnchorHeadingProps {
  as: "h2" | "h3";
  children: ReactNode;
  id: string;
}

function AnchorHeading({ as: Heading, children, id }: AnchorHeadingProps) {
  return (
    <Heading
      className={
        Heading === "h2"
          ? "font-semibold text-foreground text-heading-2"
          : "font-semibold text-foreground text-heading-4"
      }
    >
      <HeadingAnchor id={id}>{children}</HeadingAnchor>
    </Heading>
  );
}

interface DocsSectionProps<T extends DocsSections> {
  children: ReactNode;
  id: T[number]["id"];
  sections: T;
}

function DocsSection<T extends DocsSections>({
  children,
  id,
  sections,
}: DocsSectionProps<T>) {
  return (
    <section className="flex scroll-mt-20 flex-col gap-4" id={id}>
      <AnchorHeading as="h2" id={id}>
        {sections.find((section) => section.id === id)?.label}
      </AnchorHeading>
      {children}
    </section>
  );
}

interface DocsSubsectionProps {
  children: ReactNode;
  id?: string;
  title: ReactNode;
}

function DocsSubsection({ children, id, title }: DocsSubsectionProps) {
  return (
    <div className="flex scroll-mt-20 flex-col gap-3" id={id}>
      {id ? (
        <AnchorHeading as="h3" id={id}>
          {title}
        </AnchorHeading>
      ) : (
        <h3 className="font-semibold text-foreground text-heading-4">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function DocsText({ children }: { children: ReactNode }) {
  return (
    <p className="text-body text-muted-foreground leading-relaxed">
      {children}
    </p>
  );
}

function DocsList({ children }: { children: ReactNode }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5 text-body text-muted-foreground leading-relaxed marker:text-muted-foreground">
      {children}
    </ul>
  );
}

function DocsNote({ children }: { children: ReactNode }) {
  return (
    <Alert>
      <Info aria-hidden />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

interface DocsLinkProps {
  children: ReactNode;
  href: string;
}

function DocsLink({ children, href }: DocsLinkProps) {
  const className = cn(textVariants({ variant: "link" }));
  if (href.startsWith("http")) {
    return (
      <a
        className={className}
        href={href}
        rel="noopener noreferrer"
        target="_blank"
      >
        {children}
      </a>
    );
  }
  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}

export type { DocsSections };
export {
  DocsLink,
  DocsList,
  DocsNote,
  DocsPage,
  DocsSection,
  DocsSubsection,
  DocsText,
};
