import type { Metadata } from "next";

import { DocsCardGrid } from "@/components/docs/docs-card-grid";
import { DocsPage } from "@/components/docs/docs-page";

export const metadata: Metadata = {
  description:
    "Complete developer documentation for Reflet. Explore the SDK, React hooks, embeddable widgets, REST API, and component library to integrate user feedback.",
  title: "Documentation",
};

const SECTIONS = [
  {
    description:
      "Read and write feedback from your app with a typed client and React hooks.",
    href: "/docs/sdk",
    title: "SDK",
  },
  {
    description: "Drop a feedback button or a changelog popover into any site.",
    href: "/docs/widget",
    title: "Widgets",
  },
  {
    description:
      "Manage feedback, votes, comments, the roadmap and the changelog over HTTP.",
    href: "/docs/api",
    title: "REST API",
  },
  {
    description:
      "Install feedback cards and milestone views from the shadcn registry.",
    href: "/docs/components",
    title: "Component library",
  },
  {
    description:
      "Let coding agents read, claim and close feedback from a shell.",
    href: "/docs/cli",
    title: "CLI for agents",
  },
] as const;

export default function DocsIndexPage() {
  return (
    <DocsPage
      description="Everything you need to put Reflet inside your product: the SDK, embeddable widgets, the REST API, the component library and the CLI."
      title="Reflet documentation"
    >
      <DocsCardGrid headingLevel="h2" items={SECTIONS} />
    </DocsPage>
  );
}
