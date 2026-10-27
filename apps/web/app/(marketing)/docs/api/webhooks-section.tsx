import { CodeBlock } from "@/components/docs/code-block";
import {
  DocsNote,
  DocsSection,
  type DocsSections,
  DocsSubsection,
  DocsText,
} from "@/components/docs/docs-page";
import { ReferenceTable } from "@/components/docs/reference-table";

const EVENTS = [
  [
    "feedback.created",
    "Feedback becomes approved and publishable, not merely when the create request returns.",
  ],
  ["feedback.status_changed", "The lifecycle or custom board status changes."],
  [
    "feedback.github_issue_created",
    "A GitHub issue is created for or linked to feedback.",
  ],
  ["survey.response.completed", "A respondent completes a survey."],
] as const;

const VERIFY_EXAMPLE = `import { createHmac, timingSafeEqual } from "node:crypto";

// Call with the original request bytes, before JSON parsing.
export function verifyReflet(rawBody: Buffer, signature: string, secret: string) {
  const expected = Buffer.from(
    "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex"),
    "utf8"
  );
  const received = Buffer.from(signature, "utf8");
  return received.length === expected.length && timingSafeEqual(received, expected);
}`;

export function WebhooksSection({ sections }: { sections: DocsSections }) {
  return (
    <DocsSection id="webhooks" sections={sections}>
      <DocsText>
        An organization owner or administrator configures outbound webhooks in
        the dashboard API key settings. Choose events and a publicly reachable
        HTTP(S) receiver. Copy the signing secret at creation; it is not shown
        in the webhook list. This secret is separate from organization API keys.
        Private network targets are rejected and redirects are not followed.
      </DocsText>
      <ReferenceTable
        columns={[
          { kind: "name", label: "Event" },
          { kind: "text", label: "Sent when" },
        ]}
        rows={EVENTS.map(([event, description]) => ({
          cells: [event, description],
          key: event,
        }))}
      />
      <DocsSubsection id="webhook-request" title="Request and payload">
        <DocsText>
          Reflet sends a JSON POST with Content-Type: application/json,
          User-Agent: Reflet-Webhooks/1.0, X-Reflet-Event, X-Reflet-Delivery and
          X-Reflet-Signature. The delivery header matches the payload id and is
          stable across retries. The signature is sha256= followed by the
          lowercase hexadecimal HMAC-SHA256 of the exact body bytes, keyed with
          the webhook secret.
        </DocsText>
        <CodeBlock
          code={`{
  "id": "<delivery ID>",
  "event": "feedback.status_changed",
  "createdAt": 1793000000000,
  "organizationId": "<organization ID>",
  "data": { "feedback": { "id": "<feedback ID>", "title": "Export invoices", "status": "planned" } }
}`}
          title="Envelope with abbreviated feedback data"
        />
        <DocsText>
          Feedback events contain data.feedback in the secret-key feedback
          detail shape, including private context, GitHub fields and author
          email when present. Survey completion contains data.survey with _id
          and title, and data.response with _id, channel, startedAt,
          completedAt, endingId, respondentId, externalUserId, pageUrl and
          answers. Each answer has questionId, questionTitle, questionType and
          value. Optional fields may be absent.
        </DocsText>
        <DocsText>
          Payload data is loaded when each attempt runs, not frozen at event
          time. A retry can therefore have the same delivery ID but newer data
          and a different signature. Missing subjects, disabled receivers and
          feedback no longer approved for publication are skipped. Internal
          feedback is not delivered. Treat receiver storage and logs as private
          organization data.
        </DocsText>
      </DocsSubsection>
      <DocsSubsection
        id="webhook-verify"
        title="Verify, deduplicate and acknowledge"
      >
        <CodeBlock code={VERIFY_EXAMPLE} />
        <DocsText>
          Reject missing or invalid signatures before processing JSON. The
          signature has no signed timestamp or replay-expiry field: persist
          processed delivery IDs and ignore duplicates. After signature
          verification, durably enqueue the event and return a 2xx within 10
          seconds. Do longer work outside the request. Do not assume events
          arrive in order or contain the previous status.
        </DocsText>
      </DocsSubsection>
      <DocsNote>
        Non-2xx responses, network failures and the 10-second timeout trigger up
        to two retries: 1 minute after the first failure, then 10 minutes after
        the second. Any 2xx succeeds. Twenty consecutive failed attempts across
        a webhook, including retries, disable it; a success resets the count.
        Review recent delivery results in the dashboard, fix the receiver and
        re-enable it to reset the failure count. Re-enabling does not replay
        exhausted deliveries.
      </DocsNote>
    </DocsSection>
  );
}
