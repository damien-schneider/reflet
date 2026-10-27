import type { Metadata } from "next";
import { CodeBlock } from "@/components/docs/code-block";
import {
  DocsLink,
  DocsList,
  DocsPage,
  DocsSection,
  DocsText,
} from "@/components/docs/docs-page";
import { InstallCommand } from "@/components/docs/install-command";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Install React feedback and milestone components as editable source through the shadcn registry.",
  path: "/docs/components/installation",
  title: "Component installation",
});
const SECTIONS = [
  { id: "prerequisites", label: "Prepare your app" },
  { id: "install", label: "Install and render" },
  { id: "reflet-data", label: "Connect your data" },
] as const;
const USAGE = `"use client";

import {
  SweepCorner, SweepCornerBadge, SweepCornerCard,
  SweepCornerContent, SweepCornerTitle,
} from "@/components/ui/feedback-sweep-corner";

export function FeedbackCard() {
  return (
    <SweepCorner defaultUpvotes={12}>
      <SweepCornerCard>
        <SweepCornerContent>
          <SweepCornerTitle>Add keyboard shortcuts</SweepCornerTitle>
        </SweepCornerContent>
      </SweepCornerCard>
      <SweepCornerBadge />
    </SweepCorner>
  );
}`;

export default function InstallationPage() {
  return (
    <DocsPage
      description="The registry copies React components into your project. They render data you supply and do not need a Reflet account or API key."
      sections={SECTIONS}
      title="Installation"
    >
      <DocsSection id="prerequisites" sections={SECTIONS}>
        <DocsList>
          <li>
            A React app with{" "}
            <DocsLink href="https://ui.shadcn.com/docs/installation">
              shadcn/ui initialized
            </DocsLink>
            , Tailwind CSS v4 and theme tokens.
          </li>
          <li>
            A working @/lib/utils import that exports cn. The registry installs
            clsx and tailwind-merge, but does not include a replacement utils
            file.
          </li>
          <li>
            A client component boundary for event handlers and state. Installed
            components include their own use client directive.
          </li>
        </DocsList>
      </DocsSection>
      <DocsSection id="install" sections={SECTIONS}>
        <InstallCommand command="npx shadcn add https://www.reflet.app/r/feedback-sweep-corner.json" />
        <CodeBlock code={USAGE} />
        <DocsText>
          The command writes components/ui/feedback-sweep-corner.tsx, adds tag
          color tokens for light and dark themes, and installs motion,
          @phosphor-icons/react, clsx and tailwind-merge. Milestone registry
          items do not need the icon package. Check the CLI's changes if your
          aliases or component directory differ.
        </DocsText>
        <DocsText>
          Other registry names: feedback-minimal-notch, feedback-editorial-feed,
          milestone-track-view, milestone-editorial-accordion and
          milestone-dashboard-timeline. Replace the name before .json in the
          command. Each component page includes its own install command and full
          source for manual installation.
        </DocsText>
        <DocsText>
          Missing styling usually means Tailwind is not scanning the installed
          source or your theme tokens are absent. See{" "}
          <DocsLink href="/docs/components/theming">theming</DocsLink>. A
          missing cn import means your shadcn utility alias needs fixing.
        </DocsText>
      </DocsSection>
      <DocsSection id="reflet-data" sections={SECTIONS}>
        <DocsText>
          These are presentational components, not widgets. Fetch your data,
          pass it as props and implement persistence, loading and error handling
          in your app. For Reflet data use{" "}
          <DocsLink href="/docs/sdk/react-hooks">SDK hooks</DocsLink> with
          RefletProvider, or your own server endpoint. Never put secret API keys
          in a component.
        </DocsText>
        <DocsText>
          defaultUpvotes/defaultDownvotes initialize local state once. Repeating
          a vote removes it; the opposite direction switches it. For persisted
          data, pass upvotes, downvotes, voteType and onVote. onVote receives
          the pressed direction; your handler updates all three state props.
          onVoteChange runs only in local mode. Reflet's public vote endpoint
          supports upvote toggles, not downvotes; adapt the controls before
          connecting them.
        </DocsText>
      </DocsSection>
    </DocsPage>
  );
}
