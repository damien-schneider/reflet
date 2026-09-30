import type { Metadata } from "next";

import { CodeBlock } from "@/components/docs/code-block";
import {
  DocsLink,
  DocsList,
  DocsPage,
  DocsSection,
  DocsSubsection,
  DocsText,
} from "@/components/docs/docs-page";
import { InstallCommand } from "@/components/docs/install-command";
import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "How to install Reflet UI components into your project using the shadcn registry.",
  path: "/docs/components/installation",
  title: "Component installation",
});

const SECTIONS = [
  { id: "prerequisites", label: "Prerequisites" },
  { id: "install", label: "Install a component" },
  { id: "installed-files", label: "What gets installed" },
  { id: "usage", label: "Usage" },
  { id: "reflet-data", label: "Connect to Reflet data" },
] as const;

const REGISTRY_ITEMS = [
  { label: "Sweep Corner", name: "feedback-sweep-corner" },
  { label: "Minimal Notch", name: "feedback-minimal-notch" },
  { label: "Editorial Feed", name: "feedback-editorial-feed" },
  { label: "Horizontal Track", name: "milestone-track-view" },
  { label: "Editorial Accordion", name: "milestone-editorial-accordion" },
  { label: "Dashboard Timeline", name: "milestone-dashboard-timeline" },
] as const;

const FILE_TREE = `components/
  ui/
    feedback-sweep-corner.tsx
    feedback-minimal-notch.tsx
    feedback-editorial-feed.tsx`;

const USAGE = `import {
  SweepCorner,
  SweepCornerBadge,
  SweepCornerCard,
  SweepCornerContent,
  SweepCornerFooter,
  SweepCornerTitle,
} from "@/components/ui/feedback-sweep-corner";

<SweepCorner defaultUpvotes={42} onVoteChange={(vote) => console.log(vote)}>
  <SweepCornerCard>
    <SweepCornerContent>
      <SweepCornerTitle>Add dark mode support</SweepCornerTitle>
    </SweepCornerContent>
    <SweepCornerBadge />
    <SweepCornerFooter comments={7} time="1 day ago" />
  </SweepCornerCard>
</SweepCorner>`;

export default function InstallationPage() {
  return (
    <DocsPage
      description="Add Reflet UI components to any project that uses shadcn/ui."
      sections={SECTIONS}
      title="Installation"
    >
      <DocsSection id="prerequisites" sections={SECTIONS}>
        <DocsList>
          <li>
            A project with{" "}
            <DocsLink href="https://ui.shadcn.com/docs/installation">
              shadcn/ui initialized
            </DocsLink>
          </li>
          <li>React 18 or 19</li>
          <li>Tailwind CSS v4</li>
        </DocsList>
      </DocsSection>

      <DocsSection id="install" sections={SECTIONS}>
        <DocsText>
          Install any component from the Reflet registry with the shadcn CLI.
        </DocsText>
        {REGISTRY_ITEMS.map((item) => (
          <DocsSubsection key={item.name} title={item.label}>
            <InstallCommand
              command={`npx shadcn add https://www.reflet.app/r/${item.name}.json`}
            />
          </DocsSubsection>
        ))}
      </DocsSection>

      <DocsSection id="installed-files" sections={SECTIONS}>
        <DocsText>
          Each command adds one component file to your{" "}
          <InlineCode>components/ui/</InlineCode> directory, adds the{" "}
          <InlineCode>--tag-*</InlineCode> color tokens to your CSS, and
          installs the packages the component needs:{" "}
          <InlineCode>motion</InlineCode>, <InlineCode>clsx</InlineCode>,{" "}
          <InlineCode>tailwind-merge</InlineCode> and, for the feedback cards,{" "}
          <InlineCode>@phosphor-icons/react</InlineCode>.
        </DocsText>
        <CodeBlock code={FILE_TREE} title="Project tree" />
      </DocsSection>

      <DocsSection id="usage" sections={SECTIONS}>
        <DocsText>
          Compose the subcomponents and pass your data as children and props.
        </DocsText>
        <CodeBlock code={USAGE} />
      </DocsSection>

      <DocsSection id="reflet-data" sections={SECTIONS}>
        <DocsText>
          These components are presentational: they take data through props and
          don’t call any backend. To show live Reflet data, fetch it with{" "}
          <DocsLink href="/docs/sdk/react-hooks">Reflet SDK hooks</DocsLink>{" "}
          such as <InlineCode>useFeedbackList()</InlineCode> and pass the items
          in.
        </DocsText>
      </DocsSection>
    </DocsPage>
  );
}
