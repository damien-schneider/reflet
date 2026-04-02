import { CODE_BLOCK_CLASS } from "@app/(marketing)/docs/api/_components/api-docs-styles";

export function ApiCommentsEndpoints() {
  return (
    <>
      {/* GET /feedback/:id/comments */}
      <div className="space-y-4" id="list-comments">
        <h4 className="font-semibold text-lg">
          <code className="mr-2 rounded bg-emerald-100 px-2 py-1 text-emerald-700 text-sm dark:bg-emerald-950 dark:text-emerald-300">
            GET
          </code>{" "}
          /api/v1/feedback/:id/comments
        </h4>
        <p className="text-muted-foreground text-sm">
          Get comments for a feedback item. Returns an array of comments with
          nested replies.
        </p>
        <div>
          <p className="mb-2 font-medium text-foreground text-xs">
            Example request
          </p>
          <pre className={CODE_BLOCK_CLASS}>
            <code>{`curl "https://your-deployment.convex.site/api/v1/feedback/fb_abc123/comments?publicKey=pk_xxx"`}</code>
          </pre>
        </div>
        <div>
          <p className="mb-2 font-medium text-foreground text-xs">
            Example response
          </p>
          <pre className={CODE_BLOCK_CLASS}>
            <code>{`{
  "comments": [
    {
      "id": "cmt_001",
      "body": "This would be amazing!",
      "authorName": "Jane Doe",
      "createdAt": "2026-01-16T09:00:00Z",
      "replies": [
        {
          "id": "cmt_002",
          "body": "Agreed, especially for late-night use.",
          "authorName": "John Smith",
          "parentId": "cmt_001",
          "createdAt": "2026-01-16T10:30:00Z"
        }
      ]
    }
  ]
}`}</code>
          </pre>
        </div>
      </div>

      {/* POST /feedback/:id/comments */}
      <div className="space-y-4" id="add-comment">
        <h4 className="font-semibold text-lg">
          <code className="mr-2 rounded bg-blue-100 px-2 py-1 text-blue-700 text-sm dark:bg-blue-950 dark:text-blue-300">
            POST
          </code>{" "}
          /api/v1/feedback/:id/comments
        </h4>
        <p className="text-muted-foreground text-sm">
          Add a comment to a feedback item. Optionally include a{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">parentId</code>{" "}
          to create a reply.
        </p>
        <div>
          <p className="mb-2 font-medium text-foreground text-xs">
            Request body
          </p>
          <pre className={CODE_BLOCK_CLASS}>
            <code>{`{
  "feedbackId": "fb_abc123",
  "body": "Great idea, would love this feature!",
  "parentId": "cmt_001"
}`}</code>
          </pre>
        </div>
        <div>
          <p className="mb-2 font-medium text-foreground text-xs">
            Example request
          </p>
          <pre className={CODE_BLOCK_CLASS}>
            <code>{`curl -X POST "https://your-deployment.convex.site/api/v1/feedback/fb_abc123/comments" \\
  -H "Authorization: Bearer sk_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"feedbackId": "fb_abc123", "body": "Great idea!"}'`}</code>
          </pre>
        </div>
        <div>
          <p className="mb-2 font-medium text-foreground text-xs">
            Example response
          </p>
          <pre className={CODE_BLOCK_CLASS}>
            <code>{`{
  "id": "cmt_003",
  "body": "Great idea!",
  "authorName": "You",
  "feedbackId": "fb_abc123",
  "createdAt": "2026-02-24T12:00:00Z"
}`}</code>
          </pre>
        </div>
      </div>
    </>
  );
}
