import { codeBlockClass } from "./code-block-class";
import { FeedbackEndpoints } from "./feedback-endpoints";

export function EndpointsSection() {
  return (
    <section className="mb-12">
      <h2
        className="mb-6 font-display text-2xl text-foreground leading-snug tracking-tight"
        id="endpoints"
      >
        Endpoints
      </h2>

      {/* Feedback Endpoints */}
      <FeedbackEndpoints />

      {/* Changelog Endpoints */}
      <div className="mb-10">
        <h3 className="mb-6 font-display text-foreground text-xl tracking-tight">
          Changelog
        </h3>
        <div className="space-y-8">
          <div className="space-y-4" id="list-changelog">
            <h4 className="font-semibold text-lg">
              <code className="mr-2 rounded bg-chart-1/15 px-2 py-1 text-chart-1-text text-sm">
                GET
              </code>{" "}
              /api/v1/changelog
            </h4>
            <p className="text-muted-foreground text-sm">
              Get published changelog entries for an organization.
            </p>
            <div>
              <p className="mb-2 font-medium text-foreground text-xs">
                Example request
              </p>
              <pre className={codeBlockClass}>
                <code>{`curl "https://your-deployment.convex.site/api/v1/changelog?publicKey=pk_xxx"`}</code>
              </pre>
            </div>
            <div>
              <p className="mb-2 font-medium text-foreground text-xs">
                Example response
              </p>
              <pre className={codeBlockClass}>
                <code>{`{
  "entries": [
    {
      "id": "cl_001",
      "title": "Dark mode is here",
      "body": "We shipped dark mode across the entire app...",
      "publishedAt": "2026-02-20T14:00:00Z",
      "tags": ["feature", "ui"]
    }
  ]
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Roadmap Endpoints */}
      <div className="mb-10">
        <h3 className="mb-6 font-display text-foreground text-xl tracking-tight">
          Roadmap
        </h3>
        <div className="space-y-8">
          <div className="space-y-4" id="list-roadmap">
            <h4 className="font-semibold text-lg">
              <code className="mr-2 rounded bg-chart-1/15 px-2 py-1 text-chart-1-text text-sm">
                GET
              </code>{" "}
              /api/v1/roadmap
            </h4>
            <p className="text-muted-foreground text-sm">
              Get public roadmap milestones for an organization.
            </p>
            <div>
              <p className="mb-2 font-medium text-foreground text-xs">
                Example request
              </p>
              <pre className={codeBlockClass}>
                <code>{`curl "https://your-deployment.convex.site/api/v1/roadmap?publicKey=pk_xxx"`}</code>
              </pre>
            </div>
            <div>
              <p className="mb-2 font-medium text-foreground text-xs">
                Example response
              </p>
              <pre className={codeBlockClass}>
                <code>{`{
  "milestones": [
    {
      "id": "ms_001",
      "title": "Q1 2026",
      "description": "First quarter priorities",
      "status": "in_progress",
      "items": [
        {
          "id": "fb_abc123",
          "title": "Add dark mode",
          "status": "completed"
        },
        {
          "id": "fb_def456",
          "title": "API webhooks",
          "status": "in_progress"
        }
      ]
    }
  ]
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Subscriptions Endpoints */}
      <div className="mb-10">
        <h3 className="mb-6 font-display text-foreground text-xl tracking-tight">
          Subscriptions
        </h3>
        <div className="space-y-8">
          <div className="space-y-4" id="subscribe">
            <h4 className="font-semibold text-lg">
              <code className="mr-2 rounded bg-chart-2/15 px-2 py-1 text-chart-2-text text-sm">
                POST
              </code>{" "}
              /api/v1/subscribe
            </h4>
            <p className="text-muted-foreground text-sm">
              Subscribe an email address to changelog updates.
            </p>
            <div>
              <p className="mb-2 font-medium text-foreground text-xs">
                Request body
              </p>
              <pre className={codeBlockClass}>
                <code>{`{
  "email": "user@example.com"
}`}</code>
              </pre>
            </div>
            <div>
              <p className="mb-2 font-medium text-foreground text-xs">
                Example request
              </p>
              <pre className={codeBlockClass}>
                <code>{`curl -X POST "https://your-deployment.convex.site/api/v1/subscribe" \\
  -H "Authorization: Bearer sk_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"email": "user@example.com"}'`}</code>
              </pre>
            </div>
            <div>
              <p className="mb-2 font-medium text-foreground text-xs">
                Example response
              </p>
              <pre className={codeBlockClass}>
                <code>{`{
  "subscribed": true,
  "email": "user@example.com"
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
