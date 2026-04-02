import { CODE_BLOCK_CLASS } from "@app/(marketing)/docs/api/_components/api-docs-styles";

export function ApiFeedbackEndpoints() {
  return (
    <>
      {/* GET /feedback */}
      <div className="space-y-4" id="list-feedback">
        <h4 className="font-semibold text-lg">
          <code className="mr-2 rounded bg-emerald-100 px-2 py-1 text-emerald-700 text-sm dark:bg-emerald-950 dark:text-emerald-300">
            GET
          </code>{" "}
          /api/v1/feedback
        </h4>
        <p className="text-muted-foreground text-sm">
          List all feedback for an organization.
        </p>
        <div>
          <p className="mb-2 font-medium text-foreground text-xs">
            Query parameters
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Parameter</th>
                  <th className="px-4 py-2 text-left font-medium">Type</th>
                  <th className="px-4 py-2 text-left font-medium">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b">
                  <td className="px-4 py-2">
                    <code className="text-foreground text-xs">publicKey</code>
                  </td>
                  <td className="px-4 py-2">string</td>
                  <td className="px-4 py-2">Required. Your public API key.</td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-2">
                    <code className="text-foreground text-xs">status</code>
                  </td>
                  <td className="px-4 py-2">string</td>
                  <td className="px-4 py-2">
                    Filter by status (e.g. open, in_progress, closed).
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-2">
                    <code className="text-foreground text-xs">sort</code>
                  </td>
                  <td className="px-4 py-2">string</td>
                  <td className="px-4 py-2">
                    Sort order: votes, newest, or oldest.
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-2">
                    <code className="text-foreground text-xs">limit</code>
                  </td>
                  <td className="px-4 py-2">number</td>
                  <td className="px-4 py-2">
                    Number of items to return (default 20).
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2">
                    <code className="text-foreground text-xs">cursor</code>
                  </td>
                  <td className="px-4 py-2">string</td>
                  <td className="px-4 py-2">
                    Pagination cursor from a previous response.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <p className="mb-2 font-medium text-foreground text-xs">
            Example request
          </p>
          <pre className={CODE_BLOCK_CLASS}>
            <code>{`curl "https://your-deployment.convex.site/api/v1/feedback?publicKey=pk_xxx&sort=votes&limit=10"`}</code>
          </pre>
        </div>
        <div>
          <p className="mb-2 font-medium text-foreground text-xs">
            Example response
          </p>
          <pre className={CODE_BLOCK_CLASS}>
            <code>{`{
  "feedback": [
    {
      "id": "fb_abc123",
      "title": "Add dark mode",
      "description": "Please add a dark mode option.",
      "status": "open",
      "voteCount": 42,
      "commentCount": 5,
      "createdAt": "2026-01-15T10:30:00Z"
    }
  ],
  "config": {
    "statuses": ["open", "in_progress", "completed", "closed"],
    "tags": ["feature", "bug", "improvement"]
  },
  "nextCursor": "eyJpZCI6ImZiX2RlZjQ1NiJ9"
}`}</code>
          </pre>
        </div>
      </div>

      {/* POST /feedback */}
      <div className="space-y-4" id="create-feedback">
        <h4 className="font-semibold text-lg">
          <code className="mr-2 rounded bg-blue-100 px-2 py-1 text-blue-700 text-sm dark:bg-blue-950 dark:text-blue-300">
            POST
          </code>{" "}
          /api/v1/feedback
        </h4>
        <p className="text-muted-foreground text-sm">
          Create new feedback. Requires a secret key or user token.
        </p>
        <div>
          <p className="mb-2 font-medium text-foreground text-xs">
            Request body
          </p>
          <pre className={CODE_BLOCK_CLASS}>
            <code>{`{
  "title": "Add dark mode",
  "description": "It would be great to have a dark mode option.",
  "tagId": "tag_feature"
}`}</code>
          </pre>
        </div>
        <div>
          <p className="mb-2 font-medium text-foreground text-xs">
            Example request
          </p>
          <pre className={CODE_BLOCK_CLASS}>
            <code>{`curl -X POST "https://your-deployment.convex.site/api/v1/feedback" \\
  -H "Authorization: Bearer sk_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Add dark mode", "description": "Please add a dark mode option."}'`}</code>
          </pre>
        </div>
        <div>
          <p className="mb-2 font-medium text-foreground text-xs">
            Example response
          </p>
          <pre className={CODE_BLOCK_CLASS}>
            <code>{`{
  "id": "fb_abc123",
  "title": "Add dark mode",
  "description": "Please add a dark mode option.",
  "status": "open",
  "voteCount": 0,
  "commentCount": 0,
  "createdAt": "2026-02-24T12:00:00Z"
}`}</code>
          </pre>
        </div>
      </div>

      {/* GET /feedback/:id */}
      <div className="space-y-4" id="get-feedback">
        <h4 className="font-semibold text-lg">
          <code className="mr-2 rounded bg-emerald-100 px-2 py-1 text-emerald-700 text-sm dark:bg-emerald-950 dark:text-emerald-300">
            GET
          </code>{" "}
          /api/v1/feedback/:id
        </h4>
        <p className="text-muted-foreground text-sm">
          Get a single feedback item by ID. Returns the feedback object with
          vote count, comments count, and status.
        </p>
        <div>
          <p className="mb-2 font-medium text-foreground text-xs">
            Example request
          </p>
          <pre className={CODE_BLOCK_CLASS}>
            <code>{`curl "https://your-deployment.convex.site/api/v1/feedback/fb_abc123?publicKey=pk_xxx"`}</code>
          </pre>
        </div>
        <div>
          <p className="mb-2 font-medium text-foreground text-xs">
            Example response
          </p>
          <pre className={CODE_BLOCK_CLASS}>
            <code>{`{
  "id": "fb_abc123",
  "title": "Add dark mode",
  "description": "Please add a dark mode option.",
  "status": "open",
  "voteCount": 42,
  "commentCount": 5,
  "tagId": "tag_feature",
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-02-20T08:15:00Z"
}`}</code>
          </pre>
        </div>
      </div>

      {/* POST /feedback/:id/vote */}
      <div className="space-y-4" id="vote-feedback">
        <h4 className="font-semibold text-lg">
          <code className="mr-2 rounded bg-blue-100 px-2 py-1 text-blue-700 text-sm dark:bg-blue-950 dark:text-blue-300">
            POST
          </code>{" "}
          /api/v1/feedback/:id/vote
        </h4>
        <p className="text-muted-foreground text-sm">
          Vote on a feedback item.
        </p>
        <div>
          <p className="mb-2 font-medium text-foreground text-xs">
            Request body
          </p>
          <pre className={CODE_BLOCK_CLASS}>
            <code>{`{
  "feedbackId": "fb_abc123",
  "voteType": "upvote"
}`}</code>
          </pre>
        </div>
        <div>
          <p className="mb-2 font-medium text-foreground text-xs">
            Example request
          </p>
          <pre className={CODE_BLOCK_CLASS}>
            <code>{`curl -X POST "https://your-deployment.convex.site/api/v1/feedback/fb_abc123/vote" \\
  -H "Authorization: Bearer sk_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"feedbackId": "fb_abc123", "voteType": "upvote"}'`}</code>
          </pre>
        </div>
        <p className="text-muted-foreground text-sm">
          The{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">voteType</code>{" "}
          field accepts{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">upvote</code>{" "}
          or{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">downvote</code>
          .
        </p>
      </div>
    </>
  );
}
