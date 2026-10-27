import type { Metadata } from "next";
import { CodeBlock } from "@/components/docs/code-block";
import {
  DocsLink,
  DocsList,
  DocsPage,
  DocsSection,
  DocsText,
} from "@/components/docs/docs-page";
import { ReferenceTable } from "@/components/docs/reference-table";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Configure RefletProvider and use feedback queries and mutations in React.",
  path: "/docs/sdk/react-hooks",
  title: "React hooks",
});

const SECTIONS = [
  { id: "provider", label: "Mount the provider" },
  { id: "queries", label: "Read data" },
  { id: "mutations", label: "Write and refresh" },
  { id: "components", label: "Use ready-made components" },
] as const;

const PROVIDER = `"use client";

import type { ReactNode } from "react";
import { RefletProvider } from "reflet-sdk/react";

export function FeedbackProvider({
  children,
  userToken,
}: {
  children: ReactNode;
  userToken?: string;
}) {
  return (
    <RefletProvider
      publicKey="fb_pub_YOUR_PUBLIC_KEY"
      userToken={userToken}
    >
      {children}
    </RefletProvider>
  );
}`;

const QUERY = `"use client";

import { useFeedbackList } from "reflet-sdk/react";

export function RecentFeedback() {
  const { data, error, isLoading, refetch } = useFeedbackList({
    sortBy: "newest",
    limit: 20,
  });

  if (error) {
    return (
      <div role="alert">
        <p>{error.message}</p>
        <button onClick={() => void refetch()} type="button">Try again</button>
      </div>
    );
  }
  if (isLoading && !data) return <p>Loading feedback...</p>;
  if (!data?.items.length) return <p>No feedback yet.</p>;

  return <ul>{data.items.map((item) => <li key={item.id}>{item.title}</li>)}</ul>;
}`;

const MUTATION = `"use client";

import { useFeedbackList, useVote } from "reflet-sdk/react";

export function FeedbackVotes() {
  const list = useFeedbackList({ sortBy: "votes" });
  const vote = useVote();

  async function handleVote(feedbackId: string) {
    try {
      await vote.mutate({ feedbackId });
      await list.refetch();
    } catch {
      // The mutation stores this error for the alert below.
      return;
    }
  }

  return (
    <section>
      {list.isLoading && <p>Loading feedback...</p>}
      {(list.error || vote.error) && (
        <p role="alert">{(list.error ?? vote.error)?.message}</p>
      )}
      <ul>
        {list.data?.items.map((item) => (
          <li key={item.id}>
            {item.title}
            <button
              disabled={vote.isLoading}
              onClick={() => void handleVote(item.id)}
              type="button"
            >
              {item.hasVoted ? "Remove vote" : "Vote"} ({item.voteCount})
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}`;

const COLUMNS = [
  { kind: "name", label: "Hook" },
  { kind: "text", label: "Arguments and result" },
] as const;

const QUERIES = [
  {
    cells: [
      "useOrganizationConfig()",
      "OrganizationConfig: branding, settings, and custom statuses.",
    ],
    key: "useOrganizationConfig",
  },
  {
    cells: [
      "useFeedbackList(options?)",
      "{ items, total, hasMore }. All client list filters plus enabled (default true).",
    ],
    key: "useFeedbackList",
  },
  {
    cells: [
      "useFeedback(feedbackId)",
      "FeedbackDetail. Pass undefined to disable automatic fetching.",
    ],
    key: "useFeedback",
  },
  {
    cells: [
      "useComments(feedbackId, sortBy?)",
      "Comment[] including replies. Pass undefined to disable; sort is oldest (default) or newest.",
    ],
    key: "useComments",
  },
  {
    cells: ["useRoadmap()", "Roadmap with lanes and their items."],
    key: "useRoadmap",
  },
  {
    cells: ["useChangelog(limit?)", "ChangelogEntry[] with linked feedback."],
    key: "useChangelog",
  },
  {
    cells: [
      "useUnreadChangelogCount(publicKey)",
      "{ unreadCount, markAsRead }. Tracks the last seen published timestamp in localStorage for this public key, not per user.",
    ],
    key: "useUnreadChangelogCount",
  },
] as const;

const MUTATIONS = [
  {
    cells: [
      "useCreateFeedback()",
      "mutate({ title, description, context? }) returns { feedbackId, isApproved }.",
    ],
    key: "useCreateFeedback",
  },
  {
    cells: [
      "useVote()",
      "mutate({ feedbackId, type? }) returns { voted, voteCount }; type is upvote or downvote.",
    ],
    key: "useVote",
  },
  {
    cells: [
      "useAddComment()",
      "mutate({ feedbackId, body, parentId? }) returns { commentId }.",
    ],
    key: "useAddComment",
  },
  {
    cells: [
      "useSubscription()",
      "subscribe(feedbackId), unsubscribe(feedbackId), isLoading, error. Each action returns its API result; there is no mutate or reset method.",
    ],
    key: "useSubscription",
  },
] as const;

export default function ReactHooksPage() {
  return (
    <DocsPage
      description="Build your own feedback interface with hooks from reflet-sdk/react. React and React DOM 18 or 19 are required."
      sections={SECTIONS}
      title="React hooks"
    >
      <DocsSection id="provider" sections={SECTIONS}>
        <CodeBlock code={PROVIDER} />
        <DocsText>
          In Next.js, put hooks and this wrapper in a client component. Fetch
          signed tokens through your app's authenticated server flow, then pass
          them as <code>userToken</code>. The provider accepts{" "}
          <code>publicKey</code>, <code>baseUrl</code>, <code>user</code>, and{" "}
          <code>userToken</code>, with the same{" "}
          <DocsLink href="/docs/sdk/installation">
            access boundaries as the client
          </DocsLink>
          .
        </DocsText>
        <DocsList>
          <li>
            <code>useRefletClient()</code> returns the current client for
            methods without a hook.
          </li>
          <li>
            <code>useRefletContext()</code> returns the client, publicKey,
            baseUrl, user, userToken, setUser, and isReady. Both hooks throw
            outside a provider.
          </li>
          <li>
            <code>isReady</code> means client hydration has occurred. It does
            not verify the API key, network, or sign-in.
          </li>
          <li>
            <code>user</code> initializes local state only. Use the context's{" "}
            <code>setUser</code> for later unsigned identity changes. A supplied
            userToken takes priority; update or remove that prop when refreshing
            a token or signing out.
          </li>
        </DocsList>
      </DocsSection>
      <DocsSection id="queries" sections={SECTIONS}>
        <CodeBlock code={QUERY} />
        <ReferenceTable columns={COLUMNS} rows={QUERIES} />
        <DocsText>
          Queries return <code>data</code> (initially undefined),{" "}
          <code>isLoading</code>, <code>error</code> (initially null), and{" "}
          <code>refetch()</code>. They run on mount and when their client or
          arguments change. A failed refetch keeps previous data and stores the
          error rather than rejecting the refetch promise. Disabled queries do
          not run automatically; calling refetch still runs the request.
        </DocsText>
        <DocsText>
          Each hook owns its own state. There is no shared query cache,
          background polling, automatic pagination, or cross-component
          invalidation. See the{" "}
          <DocsLink href="/docs/sdk/client#reads">client guide</DocsLink> for
          filters.
        </DocsText>
      </DocsSection>
      <DocsSection id="mutations" sections={SECTIONS}>
        <DocsText>
          Mount this example under a provider with a signed userToken. After a
          successful mutation, refetch the affected query yourself. Mutations do
          not optimistically change query results.
        </DocsText>
        <CodeBlock code={MUTATION} />
        <ReferenceTable columns={COLUMNS} rows={MUTATIONS} />
        <DocsText>
          The create, vote, and comment hooks return <code>mutate</code>,{" "}
          <code>data</code>, <code>isLoading</code>, <code>error</code>, and{" "}
          <code>reset</code>. <code>mutate</code> both stores failures and
          rejects, so catch it in event handlers. <code>reset()</code> clears
          stored data and error; it does not cancel a request. For
          status-specific UI, inspect{" "}
          <DocsLink href="/docs/sdk/client#errors">RefletError</DocsLink>.
        </DocsText>
      </DocsSection>
      <DocsSection id="components" sections={SECTIONS}>
        <DocsText>
          The same React entry exports{" "}
          <DocsLink href="/docs/widget/feedback-widget">
            FeedbackButton and FeedbackDialog
          </DocsLink>
          ,{" "}
          <DocsLink href="/docs/widget/changelog-widget">
            ChangelogWidget
          </DocsLink>
          , and{" "}
          <DocsLink href="/docs/sdk/surveys">
            survey delivery and rendering
          </DocsLink>
          . Import <code>RefletFeedback</code> from{" "}
          <code>reflet-sdk/feedback</code> for the{" "}
          <DocsLink href="/docs/widget/floating-feedback">
            floating capture widget
          </DocsLink>
          .
        </DocsText>
      </DocsSection>
    </DocsPage>
  );
}
