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
import { generatePageMetadata } from "@/lib/seo-config";
import { AdminSection } from "./admin-section";
import { EndpointsSection } from "./endpoints-section";
import { WebhooksSection } from "./webhooks-section";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Authentication, public REST endpoints, administrative endpoints and outbound webhooks.",
  path: "/docs/api",
  title: "HTTP API",
});

const SECTIONS = [
  { id: "base-url", label: "Make a request" },
  { id: "authentication", label: "Authentication" },
  { id: "endpoints", label: "Public endpoints" },
  { id: "admin-api", label: "Administrative endpoints" },
  { id: "sdk-transports", label: "Member and recording transports" },
  { id: "webhooks", label: "Receive webhooks" },
  { id: "rate-limiting", label: "Rate limits" },
  { id: "errors", label: "Handle errors" },
] as const;

const KEY_ROWS = [
  {
    cells: [
      "fb_pub_",
      "Browser-safe organization key. Reads public organizations, creates feedback and uploads, and retrieves/answers surveys even in private organizations. Does not grant administration or identify a user.",
    ],
    key: "public",
  },
  {
    cells: [
      "fb_sec_",
      "Server-only organization key. Adds private feedback reads, internal feedback creation and all administrative endpoints. Does not replace a signed user token for end-user actions.",
    ],
    key: "secret",
  },
] as const;

const LIMIT_ROWS = [
  {
    cells: [
      "Create feedback, vote, comment, subscribe, unsubscribe",
      "30 per minute, shared",
    ],
    key: "write",
  },
  {
    cells: ["Request screenshot upload URLs", "300 per minute"],
    key: "uploads",
  },
  {
    cells: ["Start or dismiss survey responses", "600 per minute, shared"],
    key: "start",
  },
  {
    cells: ["Answer or complete survey responses", "3,000 per minute, shared"],
    key: "answer",
  },
] as const;

const ERROR_ROWS = [
  {
    cells: [
      "400",
      "Invalid JSON/schema or a rejected domain operation, such as an invalid survey answer. Read error for the reason.",
    ],
    key: "400",
  },
  {
    cells: [
      "401",
      "Missing/invalid bearer key, or a user action without a valid signed X-User-Token.",
    ],
    key: "401",
  },
  {
    cells: [
      "403",
      "Disallowed origin, private organization read with a public key, internal creation without a secret key, or public-key administration.",
    ],
    key: "403",
  },
  {
    cells: [
      "404",
      "A read found no accessible organization/item/resource. Some unavailable collections return [] instead.",
    ],
    key: "404",
  },
  {
    cells: [
      "429",
      "The key exhausted a write bucket. Back off before retrying.",
    ],
    key: "429",
  },
  {
    cells: [
      "500",
      "Unexpected failure. Some invalid IDs, missing admin fields and mutation errors also reach this status; inspect error rather than assuming a transient outage.",
    ],
    key: "500",
  },
] as const;

export default function ApiReferencePage() {
  return (
    <DocsPage
      description="Use the public API for customer-facing feedback and surveys. Use the administrative API for organization management. Both require an organization API key."
      sections={SECTIONS}
      title="HTTP API"
    >
      <DocsSection id="base-url" sections={SECTIONS}>
        <DocsText>
          Create an API key in your organization settings. Set the variables
          below with your real key. Examples assume a POSIX shell and curl;
          examples using jq say so. The key selects the organization.
        </DocsText>
        <CodeBlock
          code={`export REFLET_API_URL='https://harmless-clam-802.convex.site'
export REFLET_PUBLIC_KEY='fb_pub_replace_with_your_key'

curl "$REFLET_API_URL/api/v1/feedback" \\
  -H "Authorization: Bearer $REFLET_PUBLIC_KEY"`}
        />
        <DocsText>
          For self-hosting, replace REFLET_API_URL with your backend HTTP origin
          (the Convex .convex.site URL, not .convex.cloud). Public paths start
          with /api/v1; administrative paths start with /api/v1/admin. The CLI
          expects only the origin in REFLET_API_URL and appends those paths.
          Success bodies are JSON; create-feedback and create-comment return
          201, other listed operations return 200. OPTIONS preflight returns
          204.
        </DocsText>
      </DocsSection>
      <DocsSection id="authentication" sections={SECTIONS}>
        <ReferenceTable
          columns={[
            { kind: "name", label: "Key prefix" },
            { kind: "text", label: "Access" },
          ]}
          rows={KEY_ROWS}
        />
        <DocsText>
          Send Authorization: Bearer &lt;key&gt; on every request. Never put a
          secret key in browser code, URLs, repository files or logs. Restrict
          access to the server environment that holds it. Dashboard API key
          management lets administrators disable or delete credentials.
        </DocsText>
        <DocsText>
          When a public key has allowed domains, requests must supply a matching
          Origin or Referer host, including its port. A *.example.com entry
          matches subdomains, not example.com itself. Missing/mismatched origins
          receive 403. A command-line request with a restricted public key also
          needs this header, for example -H 'Origin: https://app.example.com'.
          Origin restrictions are not user authentication: non-browser clients
          can set these headers. Secret keys bypass the domain check.
        </DocsText>
        <DocsSubsection id="user-token" title="Identify an external user">
          <DocsText>
            Add X-User-Token with a token produced by signUser on your server.
            Authenticate the person in your own app before signing their ID. Use
            the secret paired with the public key, then give only the token to
            the browser. See{" "}
            <DocsLink href="/docs/sdk/installation#user-signing">
              server-side user signing
            </DocsLink>
            .
          </DocsText>
          <CodeBlock
            code={`Authorization: Bearer fb_pub_your_key
X-User-Token: <server-signed token>`}
          />
          <DocsText>
            Voting, commenting, subscribing and unsubscribing require a valid,
            unexpired signed token. Invalid tokens are ignored during key
            authentication, so those actions return 401; creation may instead
            proceed anonymously. Unsigned tokens only attribute new feedback and
            survey responses. They never update an existing user's saved
            name/email and cannot identify an ID already protected by signed
            requests. A signed token identifies your app's customer, not a
            Reflet dashboard member.
          </DocsText>
        </DocsSubsection>
        <DocsNote>
          SDK devtools, team access and recording sessions use separate
          member-scoped credentials, not a public-key shortcut or a secret key
          in the browser. See{" "}
          <DocsLink href="/docs/sdk/devtools#access">devtools access</DocsLink>{" "}
          and{" "}
          <DocsLink href="/docs/sdk/devtools#sessions">
            session transport
          </DocsLink>
          .
        </DocsNote>
      </DocsSection>
      <EndpointsSection sections={SECTIONS} />
      <AdminSection sections={SECTIONS} />
      <DocsSection id="sdk-transports" sections={SECTIONS}>
        <DocsText>
          Use the SDK for these member-scoped flows. They do not accept
          organization public/secret keys. Devtools exchanges a single-use
          connect code, codeVerifier and redirectUri at POST
          /api/v1/devtools/token for an fb_dev_ token; POST
          /api/v1/devtools/revoke revokes it. Team access exchanges code and
          codeVerifier at POST /api/v1/team/token with the approved Origin for
          an fb_team_ token; POST /api/v1/team/revoke revokes it. Session
          requests use these bearer tokens; team tokens also require their bound
          Origin.
        </DocsText>
        <DocsText>
          The /api/v1/sessions routes below are used by recording, review and
          handoff. Their request schemas, per-session limits and access rules
          belong to the{" "}
          <DocsLink href="/docs/sdk/devtools#sessions">
            session integration
          </DocsLink>
          . Devtools tokens can also create internal feedback, read feedback
          list/detail and upload/save screenshots, but cannot reach the admin
          API or other public-key routes.
        </DocsText>
        <CodeBlock
          code={`# Relative to /api/v1/sessions
GET  /identity, /list, /detail, /live, /segments/context-choices
POST /start, /collection, /update, /delete, /events
POST /upload-url, /segments, /segments/correct, /segments/retry
POST /speakers/token, /speakers, /evidence, /evidence/remove
POST /analyze
POST /proposals/decide, /proposals/edit, /proposals/clarify
POST /proposals/verify, /proposals/merge, /proposals/separate
POST /proposals/delete, /proposals/feedback
POST /handoffs, /handoffs/preview, /handoffs/delivered
POST /intentions/accept, /intentions/change, /intentions/answer
POST /intentions/attach, /intentions/keep-separate, /intentions/detach
POST /segments/context`}
        />
      </DocsSection>
      <WebhooksSection sections={SECTIONS} />
      <DocsSection id="rate-limiting" sections={SECTIONS}>
        <DocsText>
          Public-key writes use separate token buckets with the following
          capacities and refill rates, per API key. These are not fixed
          calendar-minute windows.
        </DocsText>
        <ReferenceTable
          columns={[
            { kind: "text", label: "Operation" },
            { kind: "text", label: "Public-key bucket" },
          ]}
          rows={LIMIT_ROWS}
        />
        <DocsText>
          Secret keys share a 300-per-minute bucket across these public writes.
          Public reads and saving screenshot metadata use no bucket. Admin
          operations have individual limits, such as invitation email delivery.
          On 429, back off; responses have no Retry-After or rate-limit headers.
        </DocsText>
      </DocsSection>
      <DocsSection id="errors" sections={SECTIONS}>
        <DocsText>
          Errors return a JSON error string. Check the HTTP status before using
          the result. After a network interruption, check whether a write took
          effect before retrying: votes toggle, and creation has no idempotency
          key.
        </DocsText>
        <CodeBlock code={`{ "error": "Feedback ID is required" }`} />
        <ReferenceTable
          columns={[
            { kind: "name", label: "Status" },
            { kind: "text", label: "Meaning" },
          ]}
          rows={ERROR_ROWS}
        />
      </DocsSection>
    </DocsPage>
  );
}
