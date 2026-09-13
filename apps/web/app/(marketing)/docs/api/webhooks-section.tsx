import { codeBlockClass } from "./code-block-class";

const EVENTS = [
  ["feedback.created", "Feedback became visible (created and approved)."],
  [
    "feedback.status_changed",
    "Status moved — by a member, the API, an agent, GitHub, or a release.",
  ],
  [
    "feedback.github_issue_created",
    "A GitHub issue was created for or linked to the feedback.",
  ],
] as const;

const PAYLOAD_EXAMPLE = `{
  "id": "delivery id",
  "event": "feedback.status_changed",
  "createdAt": 1726200000000,
  "organizationId": "…",
  "data": {
    "feedback": {
      "id": "js7cqbnxcv3zrgt3jj0ef3gnt17zcz79",
      "title": "Draft lost on save",
      "status": "in_progress",
      "githubIssueNumber": 42,
      "githubHtmlUrl": "https://github.com/acme/app/issues/42",
      "claimedBy": "agent@ci",
      "tags": [{ "id": "…", "name": "bug", "slug": "bug", "color": "#f00" }],
      "context": { "url": "https://app.acme.com/editor", "browser": "Chrome 128" }
    }
  }
}`;

const VERIFY_EXAMPLE = `import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyReflet(rawBody: string, signature: string, secret: string) {
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  return expected.length === signature.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}`;

export function WebhooksSection() {
  return (
    <section className="mb-12">
      <h2
        className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100"
        id="webhooks"
      >
        Webhooks
      </h2>
      <p className="mb-4 text-muted-foreground text-sm">
        Reflet POSTs a JSON payload to your endpoint when feedback changes.
        Register endpoints from{" "}
        <strong className="text-foreground">
          Dashboard &gt; Project &gt; API keys &gt; Webhooks
        </strong>
        . Each webhook has its own signing secret, shown once at creation.
      </p>

      <h3 className="mb-2 font-semibold text-sm">Events</h3>
      <div className="mb-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <tbody>
            {EVENTS.map(([event, description]) => (
              <tr className="border-b last:border-b-0" key={event}>
                <td className="px-4 py-2">
                  <code className="text-foreground text-xs">{event}</code>
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mb-2 font-semibold text-sm">Request</h3>
      <p className="mb-2 text-muted-foreground text-sm">
        Headers:{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          X-Reflet-Event
        </code>
        ,{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          X-Reflet-Delivery
        </code>{" "}
        (unique per attempt series, use it to dedupe) and{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          X-Reflet-Signature
        </code>{" "}
        (<code className="rounded bg-muted px-1 py-0.5 text-xs">sha256=</code>
        HMAC-SHA256 of the raw body with the webhook secret).
      </p>
      <pre className={`mb-6 ${codeBlockClass}`}>
        <code>{PAYLOAD_EXAMPLE}</code>
      </pre>

      <h3 className="mb-2 font-semibold text-sm">Verify the signature</h3>
      <pre className={`mb-6 ${codeBlockClass}`}>
        <code>{VERIFY_EXAMPLE}</code>
      </pre>

      <p className="rounded-lg border border-border bg-muted/30 p-3 text-muted-foreground text-sm">
        Respond with any 2xx within 10 seconds. Failures retry after 1 minute
        and again after 10 minutes; a webhook that fails 20 deliveries in a row
        is disabled until you re-enable it. Only approved feedback is delivered.
      </p>
    </section>
  );
}
