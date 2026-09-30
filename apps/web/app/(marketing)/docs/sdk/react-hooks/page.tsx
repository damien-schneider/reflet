import type { Metadata } from "next";

import { CodeBlock } from "@/components/docs/code-block";
import {
  DocsPage,
  DocsSection,
  DocsSubsection,
  DocsText,
} from "@/components/docs/docs-page";
import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "React hooks for the Reflet SDK: feedback lists, voting, comments, roadmaps, and more.",
  path: "/docs/sdk/react-hooks",
  title: "React hooks",
});

const HOOKS = [
  {
    description: "Fetch a paginated list of feedback items with filters.",
    name: "useFeedbackList",
    usage: `const { data, isLoading } = useFeedbackList({
  status: "open",
  sortBy: "votes",
  limit: 20,
});`,
  },
  {
    description: "Fetch a single feedback item by ID.",
    name: "useFeedback",
    usage: "const { data, isLoading } = useFeedback(feedbackId);",
  },
  {
    description: "Toggle a vote on a feedback item.",
    name: "useVote",
    usage: `const { mutate: vote } = useVote();
vote({ feedbackId: "abc123" });`,
  },
  {
    description: "Submit new feedback.",
    name: "useCreateFeedback",
    usage: `const { mutate: create } = useCreateFeedback();
create({ title: "New idea", description: "Details…" });`,
  },
  {
    description: "Fetch comments for a feedback item.",
    name: "useComments",
    usage: "const { data: comments } = useComments(feedbackId);",
  },
  {
    description: "Add a comment or reply to a feedback item.",
    name: "useAddComment",
    usage: `const { mutate: addComment } = useAddComment();
addComment({ feedbackId, body: "Great idea!" });`,
  },
  {
    description: "Fetch the organization’s roadmap with lanes and items.",
    name: "useRoadmap",
    usage: "const { data: roadmap } = useRoadmap();",
  },
  {
    description: "Fetch changelog entries.",
    name: "useChangelog",
    usage: "const { data: entries } = useChangelog();",
  },
  {
    description: "Fetch organization settings, statuses, and branding.",
    name: "useOrganizationConfig",
    usage: "const { data: config } = useOrganizationConfig();",
  },
  {
    description: "Subscribe to or unsubscribe from updates on a feedback item.",
    name: "useSubscription",
    usage: `const { mutate: subscribe } = useSubscription();
subscribe({ feedbackId, action: "subscribe" });`,
  },
] as const;

const PROVIDER = `import { RefletProvider } from "reflet-sdk/react";

function App({ children }) {
  return (
    <RefletProvider
      publicKey="fb_pub_xxx"
      user={{ id: "user_123", email: "user@example.com" }}
    >
      {children}
    </RefletProvider>
  );
}`;

const SECTIONS = [
  { id: "provider", label: "Provider setup" },
  { id: "hooks", label: "Available hooks" },
  ...HOOKS.map((hook) => ({
    id: hook.name,
    label: hook.name,
    level: 3 as const,
  })),
] as const;

export default function ReactHooksPage() {
  return (
    <DocsPage
      description={
        <>
          Hooks for data fetching, mutations and real-time updates. Wrap your
          app in <InlineCode>RefletProvider</InlineCode> first.
        </>
      }
      sections={SECTIONS}
      title="React hooks"
    >
      <DocsSection id="provider" sections={SECTIONS}>
        <CodeBlock code={PROVIDER} />
      </DocsSection>

      <DocsSection id="hooks" sections={SECTIONS}>
        <div className="flex flex-col gap-10">
          {HOOKS.map((hook) => (
            <DocsSubsection
              id={hook.name}
              key={hook.name}
              title={<code className="font-mono">{hook.name}</code>}
            >
              <DocsText>{hook.description}</DocsText>
              <CodeBlock code={hook.usage} />
            </DocsSubsection>
          ))}
        </div>
      </DocsSection>
    </DocsPage>
  );
}
