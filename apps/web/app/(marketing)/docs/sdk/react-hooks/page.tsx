import type { Metadata } from "next";

import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "React hooks for the Reflet SDK: feedback lists, voting, comments, roadmaps, and more.",
  path: "/docs/sdk/react-hooks",
  title: "React Hooks",
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
create({ title: "New idea", description: "Details..." });`,
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
    description: "Fetch the organization's roadmap with lanes and items.",
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
    description: "Subscribe/unsubscribe to a feedback item for updates.",
    name: "useSubscription",
    usage: `const { mutate: subscribe } = useSubscription();
subscribe({ feedbackId, action: "subscribe" });`,
  },
] as const;

export default function ReactHooksPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
        React Hooks
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-xl">
        React hooks for data fetching, mutations, and real-time updates.
        Requires the <InlineCode>RefletProvider</InlineCode> wrapper.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Provider setup
        </h2>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <pre className="overflow-x-auto text-sm">
            {`import { RefletProvider } from "reflet-sdk/react";

function App({ children }) {
  return (
    <RefletProvider
      publicKey="fb_pub_xxx"
      user={{ id: "user_123", email: "user@example.com" }}
    >
      {children}
    </RefletProvider>
  );
}`}
          </pre>
        </div>
      </section>

      <section>
        <h2 className="mb-6 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Available hooks
        </h2>
        <div className="space-y-8">
          {HOOKS.map((hook) => (
            <div key={hook.name}>
              <h3 className="mb-1 font-semibold text-base">
                <InlineCode>{hook.name}</InlineCode>
              </h3>
              <p className="mb-3 text-muted-foreground text-sm">
                {hook.description}
              </p>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <pre className="overflow-x-auto text-sm">{hook.usage}</pre>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
