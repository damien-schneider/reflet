import { CodeBlock } from "@/components/docs/code-block";
import {
  DocsLink,
  DocsNote,
  DocsSection,
  type DocsSections,
  DocsSubsection,
  DocsText,
} from "@/components/docs/docs-page";
import { ReferenceTable } from "@/components/docs/reference-table";
import { InlineCode } from "@/components/ui/typography";

const EVENTS = [
  ["feedback.created", "Feedback became visible (created and approved)."],
  [
    "feedback.status_changed",
    "The status or custom status changed: by a member, the API, an agent, GitHub, a release or the automatic close of stale feedback.",
  ],
  [
    "feedback.github_issue_created",
    "A GitHub issue was created for or linked to the feedback.",
  ],
  [
    "survey.response.completed",
    "A respondent finished a survey. The payload data holds the survey (id, title) and the response (channel, ending, respondent and answers) instead of feedback.",
  ],
] as const;

const PAYLOAD_EXAMPLE = `{
  "id": "kd4n…",
  "event": "feedback.status_changed",
  "createdAt": 1757500000000,
  "organizationId": "k57e4b1n8q2x9c0r3t6w5y7z1m",
  "data": {
    "feedback": {
      "id": "js7cqbnxcv3zrgt3jj0ef3gnt17zcz79",
      "title": "Draft lost on save",
      "description": "Typing in the editor and hitting save clears the draft.",
      "status": "in_progress",
      "organizationStatus": { "id": "kx73…", "name": "In Progress", "color": "#8b5cf6" },
      "tags": [{ "id": "kt32…", "name": "Bug", "slug": "bug", "color": "red" }],
      "author": { "name": "Jane Doe", "email": "jane@acme.com", "isExternal": true },
      "voteCount": 12,
      "commentCount": 3,
      "isPinned": false,
      "isInternal": false,
      "publication": "approved",
      "assigneeId": "user_42",
      "claimedBy": "agent@ci",
      "githubIssueNumber": 42,
      "githubHtmlUrl": "https://github.com/acme/app/issues/42",
      "context": { "url": "https://app.acme.com/editor", "browser": "Chrome 128" },
      "createdAt": 1757100000000,
      "updatedAt": 1757500000000
    }
  }
}`;

const VERIFY_EXAMPLE = `import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyReflet(rawBody: string, signature: string, secret: string) {
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  return expected.length === signature.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}`;

const EVENT_COLUMNS = [
  { kind: "name", label: "Event" },
  { kind: "text", label: "Sent when" },
] as const;

export function WebhooksSection({ sections }: { sections: DocsSections }) {
  return (
    <DocsSection id="webhooks" sections={sections}>
      <DocsText>
        Reflet POSTs a JSON payload to your endpoint when feedback changes. Add
        endpoints in the Webhooks section of{" "}
        <strong className="font-medium text-foreground">
          Dashboard → Project → API keys
        </strong>
        . Each webhook has its own signing secret, shown once at creation.
      </DocsText>

      <DocsSubsection id="webhook-events" title="Events">
        <ReferenceTable
          columns={EVENT_COLUMNS}
          rows={EVENTS.map(([event, description]) => ({
            cells: [event, description],
            key: event,
          }))}
        />
      </DocsSubsection>

      <DocsSubsection id="webhook-request" title="Request">
        <DocsText>
          Headers: <InlineCode>Content-Type: application/json</InlineCode>,{" "}
          <InlineCode>User-Agent: Reflet-Webhooks/1.0</InlineCode>,{" "}
          <InlineCode>X-Reflet-Event</InlineCode>,{" "}
          <InlineCode>X-Reflet-Delivery</InlineCode> (the same on every retry,
          use it to dedupe) and <InlineCode>X-Reflet-Signature</InlineCode> (
          <InlineCode>sha256=</InlineCode> followed by the hex HMAC-SHA256 of
          the raw body, keyed with the webhook secret).
        </DocsText>
        <DocsText>
          <InlineCode>data.feedback</InlineCode> has the same shape as{" "}
          <DocsLink href="#get-feedback">
            <InlineCode>GET /feedback/item</InlineCode>
          </DocsLink>{" "}
          with a secret key, including the author’s email and the private
          fields.
        </DocsText>
        <CodeBlock code={PAYLOAD_EXAMPLE} title="Payload" />
      </DocsSubsection>

      <DocsSubsection id="webhook-verify" title="Verify the signature">
        <CodeBlock code={VERIFY_EXAMPLE} />
      </DocsSubsection>

      <DocsNote>
        Respond with any 2xx within 10 seconds. A failed delivery is retried
        after 1 minute and again after 10 minutes. A webhook is disabled after
        20 failed attempts in a row, retries included; re-enabling it resets the
        count. Only approved, non-internal feedback is delivered.
      </DocsNote>
    </DocsSection>
  );
}
