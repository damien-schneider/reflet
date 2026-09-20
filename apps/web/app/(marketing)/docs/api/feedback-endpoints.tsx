import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ctrl-ui/react/ui/table";
import { codeBlockClass } from "./code-block-class";

export function FeedbackEndpoints() {
  return (
    <div className="mb-10">
      <h3 className="mb-6 font-display text-foreground text-xl tracking-tight">
        Feedback
      </h3>
      <div className="space-y-8">
        {/* GET /feedback */}
        <div className="space-y-4" id="list-feedback">
          <h4 className="font-semibold text-lg">
            <code className="mr-2 rounded bg-chart-1/15 px-2 py-1 text-chart-1-text text-sm">
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
            <div className="overflow-hidden rounded-lg border border-border">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Parameter</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-muted-foreground">
                  <TableRow>
                    <TableCell>
                      <code className="text-foreground text-xs">publicKey</code>
                    </TableCell>
                    <TableCell>string</TableCell>
                    <TableCell className="whitespace-normal">
                      Required. Your public API key.
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <code className="text-foreground text-xs">status</code>
                    </TableCell>
                    <TableCell>string</TableCell>
                    <TableCell className="whitespace-normal">
                      Filter by status (e.g. open, in_progress, closed).
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <code className="text-foreground text-xs">sort</code>
                    </TableCell>
                    <TableCell>string</TableCell>
                    <TableCell className="whitespace-normal">
                      Sort order: votes, newest, or oldest.
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <code className="text-foreground text-xs">limit</code>
                    </TableCell>
                    <TableCell>number</TableCell>
                    <TableCell className="whitespace-normal">
                      Number of items to return (default 20).
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <code className="text-foreground text-xs">cursor</code>
                    </TableCell>
                    <TableCell>string</TableCell>
                    <TableCell className="whitespace-normal">
                      Pagination cursor from a previous response.
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
          <div>
            <p className="mb-2 font-medium text-foreground text-xs">
              Example request
            </p>
            <pre className={codeBlockClass}>
              <code>{`curl "https://your-deployment.convex.site/api/v1/feedback?publicKey=pk_xxx&sort=votes&limit=10"`}</code>
            </pre>
          </div>
          <div>
            <p className="mb-2 font-medium text-foreground text-xs">
              Example response
            </p>
            <pre className={codeBlockClass}>
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
            <code className="mr-2 rounded bg-chart-2/15 px-2 py-1 text-chart-2-text text-sm">
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
            <pre className={codeBlockClass}>
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
            <pre className={codeBlockClass}>
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
            <pre className={codeBlockClass}>
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
            <code className="mr-2 rounded bg-chart-1/15 px-2 py-1 text-chart-1-text text-sm">
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
            <pre className={codeBlockClass}>
              <code>{`curl "https://your-deployment.convex.site/api/v1/feedback/fb_abc123?publicKey=pk_xxx"`}</code>
            </pre>
          </div>
          <div>
            <p className="mb-2 font-medium text-foreground text-xs">
              Example response
            </p>
            <pre className={codeBlockClass}>
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
            <code className="mr-2 rounded bg-chart-2/15 px-2 py-1 text-chart-2-text text-sm">
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
            <pre className={codeBlockClass}>
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
            <pre className={codeBlockClass}>
              <code>{`curl -X POST "https://your-deployment.convex.site/api/v1/feedback/fb_abc123/vote" \\
  -H "Authorization: Bearer sk_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"feedbackId": "fb_abc123", "voteType": "upvote"}'`}</code>
            </pre>
          </div>
          <p className="text-muted-foreground text-sm">
            The{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              voteType
            </code>{" "}
            field accepts{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">upvote</code>{" "}
            or{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              downvote
            </code>
            .
          </p>
        </div>

        {/* GET /feedback/:id/comments */}
        <div className="space-y-4" id="list-comments">
          <h4 className="font-semibold text-lg">
            <code className="mr-2 rounded bg-chart-1/15 px-2 py-1 text-chart-1-text text-sm">
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
            <pre className={codeBlockClass}>
              <code>{`curl "https://your-deployment.convex.site/api/v1/feedback/fb_abc123/comments?publicKey=pk_xxx"`}</code>
            </pre>
          </div>
          <div>
            <p className="mb-2 font-medium text-foreground text-xs">
              Example response
            </p>
            <pre className={codeBlockClass}>
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
            <code className="mr-2 rounded bg-chart-2/15 px-2 py-1 text-chart-2-text text-sm">
              POST
            </code>{" "}
            /api/v1/feedback/:id/comments
          </h4>
          <p className="text-muted-foreground text-sm">
            Add a comment to a feedback item. Optionally include a{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              parentId
            </code>{" "}
            to create a reply.
          </p>
          <div>
            <p className="mb-2 font-medium text-foreground text-xs">
              Request body
            </p>
            <pre className={codeBlockClass}>
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
            <pre className={codeBlockClass}>
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
            <pre className={codeBlockClass}>
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
      </div>
    </div>
  );
}
