import type { Metadata } from "next";

import { CodeBlock } from "@/components/docs/code-block";
import {
  DocsLink,
  DocsNote,
  DocsPage,
  DocsSection,
  DocsSubsection,
  DocsText,
} from "@/components/docs/docs-page";
import { ReferenceTable } from "@/components/docs/reference-table";
import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";
import { BASE_URL } from "./endpoint-data";
import { EndpointsSection } from "./endpoints-section";
import { WebhooksSection } from "./webhooks-section";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Read and post feedback, votes, comments, screenshots and survey responses, and read the roadmap and changelog over HTTP.",
  keywords: [
    "rest api",
    "api reference",
    "feedback api",
    "changelog api",
    "roadmap api",
    "survey api",
    "webhooks",
  ],
  path: "/docs/api",
  title: "REST API reference",
});

const SECTIONS = [
  { id: "authentication", label: "Authentication" },
  { id: "base-url", label: "Base URL" },
  { id: "endpoints", label: "Endpoints" },
  { id: "webhooks", label: "Webhooks" },
  { id: "rate-limiting", label: "Rate limiting" },
  { id: "errors", label: "Errors" },
] as const;

const KEY_COLUMNS = [
  { kind: "name", label: "Key" },
  { kind: "text", label: "Use it for" },
] as const;

const KEY_ROWS = [
  {
    cells: [
      "fb_pub_…",
      "Browsers and apps. Reads public organizations, posts feedback and screenshots into any organization, answers surveys.",
    ],
    key: "public",
  },
  {
    cells: [
      "fb_sec_…",
      "Your server only. Everything a public key does, plus private organizations, internal feedback and private fields.",
    ],
    key: "secret",
  },
] as const;

const ERROR_ROWS = [
  {
    cells: [
      "400",
      "Bad request",
      "Invalid JSON body or a missing required field.",
    ],
    key: "400",
  },
  {
    cells: [
      "401",
      "Unauthorized",
      "Missing or invalid API key, or the endpoint needs a signed user token.",
    ],
    key: "401",
  },
  {
    cells: [
      "403",
      "Forbidden",
      "A public key on a private organization, or internal feedback without the secret key.",
    ],
    key: "403",
  },
  {
    cells: ["404", "Not found", "The organization or feedback doesn’t exist."],
    key: "404",
  },
  {
    cells: ["429", "Rate limited", "Too many writes. Retry after a minute."],
    key: "429",
  },
  {
    cells: [
      "500",
      "Server error",
      "The request was rejected while processing, e.g. an unknown ID. The message says why.",
    ],
    key: "500",
  },
] as const;

function AuthenticationSection() {
  return (
    <DocsSection id="authentication" sections={SECTIONS}>
      <DocsText>
        Send your key in the <InlineCode>Authorization</InlineCode> header on
        every request, whichever key it is. The key also picks the organization,
        so no endpoint takes an organization ID.
      </DocsText>
      <CodeBlock code="Authorization: Bearer fb_pub_your_public_key" />
      <ReferenceTable columns={KEY_COLUMNS} rows={KEY_ROWS} />
      <DocsNote>
        Create keys in{" "}
        <strong className="font-medium text-foreground">
          Dashboard → Project → API keys
        </strong>
        . Never ship the secret key to a browser.
      </DocsNote>
      <DocsSubsection id="user-token" title="User token">
        <DocsText>
          To act as one of your users, add their token in{" "}
          <InlineCode>X-User-Token</InlineCode>. Voting, commenting and
          subscribing need a token signed on your server; see{" "}
          <DocsLink href="/docs/sdk/installation#user-signing">
            server-side user signing
          </DocsLink>
          . An unsigned token, like the one the SDK builds from its{" "}
          <InlineCode>user</InlineCode> option, only credits new feedback and
          survey responses to that user. It never changes a user’s saved name or
          email. Once a signed token is used for a user ID, unsigned tokens for
          that ID are ignored. For users last identified by a signed token
          before this protection shipped, it applies from their next signed
          request.
        </DocsText>
        <CodeBlock
          code={`Authorization: Bearer fb_pub_your_public_key
X-User-Token: <token signed on your server>`}
        />
      </DocsSubsection>
    </DocsSection>
  );
}

export default function ApiReferencePage() {
  return (
    <DocsPage
      description="Read and post feedback, votes, comments, screenshots and survey responses, and read the roadmap and changelog over HTTP."
      sections={SECTIONS}
      title="REST API reference"
    >
      <AuthenticationSection />

      <DocsSection id="base-url" sections={SECTIONS}>
        <CodeBlock code={BASE_URL} />
        <DocsText>
          Every path below is relative to this URL. It’s the same one the SDK
          and CLI call by default. Self-hosting? Use your own Convex
          deployment’s <InlineCode>.convex.site</InlineCode> URL instead.
        </DocsText>
      </DocsSection>

      <EndpointsSection sections={SECTIONS} />

      <WebhooksSection sections={SECTIONS} />

      <DocsSection id="rate-limiting" sections={SECTIONS}>
        <DocsText>
          A public key can create 30 feedback items or comments per minute,
          start 600 survey responses per minute and request 300 screenshot
          upload URLs per minute; each limit is separate. A secret key shares
          300 writes per minute across all of these. While a key is over a
          limit, those requests return <InlineCode>429</InlineCode>. Saving a
          screenshot isn’t rate limited, but a public key can attach at most 10
          screenshots per feedback item. Reads, votes, subscriptions and survey
          answers aren’t rate limited, and responses carry no rate-limit
          headers.
        </DocsText>
      </DocsSection>

      <DocsSection id="errors" sections={SECTIONS}>
        <DocsText>
          Every error response is JSON with an <InlineCode>error</InlineCode>{" "}
          field describing the issue.
        </DocsText>
        <CodeBlock
          code={`{
  "error": "Feedback ID is required"
}`}
        />
        <ReferenceTable
          columns={[
            { kind: "name", label: "Status code" },
            { kind: "text", label: "Meaning" },
            { kind: "text", label: "Description" },
          ]}
          rows={ERROR_ROWS}
        />
      </DocsSection>
    </DocsPage>
  );
}
