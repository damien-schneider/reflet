import type { Metadata } from "next";

import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  title: "REST API Reference",
  description:
    "Full API for managing feedback, votes, comments, changelog, and roadmap programmatically.",
  path: "/docs/api",
  keywords: [
    "rest api",
    "api reference",
    "feedback api",
    "changelog api",
    "roadmap api",
    "endpoints",
  ],
});

const codeBlockClass =
  "overflow-x-auto rounded-lg border border-border bg-muted p-4 text-sm";

export default function ApiReferencePage() {
  return (
    <div className="mx-auto max-w-4xl py-12">
      <div className="mb-10">
        <h1 className="font-display text-4xl text-olive-950 leading-tight tracking-tight sm:text-5xl dark:text-olive-100">
          REST API Reference
        </h1>
        <p className="mt-2 text-base text-muted-foreground sm:text-xl">
          Full API for managing feedback, votes, comments, changelog, and
          roadmap programmatically.
        </p>
      </div>

      {/* Authentication */}
      <section className="mb-12">
        <h2
          className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100"
          id="authentication"
        >
          Authentication
        </h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Reflet uses two types of API keys to separate read and write
          operations.
        </p>
        <div className="space-y-4">
          <div className="rounded-lg border border-border p-4">
            <h3 className="mb-1 font-semibold text-sm">
              Public Key{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                pk_...
              </code>
            </h3>
            <p className="text-muted-foreground text-sm">
              Passed as a query parameter. Used for read-only operations that
              are safe to call from client-side code.
            </p>
            <pre className={`mt-3 ${codeBlockClass}`}>
              <code>GET /api/v1/feedback?publicKey=pk_your_public_key</code>
            </pre>
          </div>
          <div className="rounded-lg border border-border p-4">
            <h3 className="mb-1 font-semibold text-sm">
              Secret Key{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                sk_...
              </code>
            </h3>
            <p className="text-muted-foreground text-sm">
              Passed as an{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                Authorization
              </code>{" "}
              header. Used for write operations and should only be used from
              server-side code.
            </p>
            <pre className={`mt-3 ${codeBlockClass}`}>
              <code>Authorization: Bearer sk_your_secret_key</code>
            </pre>
          </div>
        </div>
        <p className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-muted-foreground text-sm">
          Get your API keys from{" "}
          <strong className="text-foreground">
            Dashboard &gt; Settings &gt; API Keys
          </strong>
          .
        </p>
      </section>

      {/* Base URL */}
      <section className="mb-12">
        <h2
          className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100"
          id="base-url"
        >
          Base URL
        </h2>
        <pre className={codeBlockClass}>
          <code>https://your-deployment.convex.site/api/v1</code>
        </pre>
        <p className="mt-3 text-muted-foreground text-sm">
          This is the Convex HTTP endpoint for your deployment. Replace{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            your-deployment
          </code>{" "}
          with your actual Convex deployment URL.
        </p>
      </section>

      {/* Endpoints */}
      <section className="mb-12">
        <h2
          className="mb-6 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100"
          id="endpoints"
        >
          Endpoints
        </h2>

        {/* Feedback Endpoints */}
        <div className="mb-10">
          <h3 className="mb-6 font-display text-olive-950 text-xl tracking-tight dark:text-olive-100">
            Feedback
          </h3>
          <div className="space-y-8">
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
                        <th className="px-4 py-2 text-left font-medium">
                          Parameter
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Type
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b">
                        <td className="px-4 py-2">
                          <code className="text-foreground text-xs">
                            publicKey
                          </code>
                        </td>
                        <td className="px-4 py-2">string</td>
                        <td className="px-4 py-2">
                          Required. Your public API key.
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-2">
                          <code className="text-foreground text-xs">
                            status
                          </code>
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
                          <code className="text-foreground text-xs">
                            cursor
                          </code>
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
                <code className="mr-2 rounded bg-emerald-100 px-2 py-1 text-emerald-700 text-sm dark:bg-emerald-950 dark:text-emerald-300">
                  GET
                </code>{" "}
                /api/v1/feedback/:id
              </h4>
              <p className="text-muted-foreground text-sm">
                Get a single feedback item by ID. Returns the feedback object
                with vote count, comments count, and status.
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
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  upvote
                </code>{" "}
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
                <code className="mr-2 rounded bg-emerald-100 px-2 py-1 text-emerald-700 text-sm dark:bg-emerald-950 dark:text-emerald-300">
                  GET
                </code>{" "}
                /api/v1/feedback/:id/comments
              </h4>
              <p className="text-muted-foreground text-sm">
                Get comments for a feedback item. Returns an array of comments
                with nested replies.
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
                <code className="mr-2 rounded bg-blue-100 px-2 py-1 text-blue-700 text-sm dark:bg-blue-950 dark:text-blue-300">
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

        {/* Changelog Endpoints */}
        <div className="mb-10">
          <h3 className="mb-6 font-display text-olive-950 text-xl tracking-tight dark:text-olive-100">
            Changelog
          </h3>
          <div className="space-y-8">
            <div className="space-y-4" id="list-changelog">
              <h4 className="font-semibold text-lg">
                <code className="mr-2 rounded bg-emerald-100 px-2 py-1 text-emerald-700 text-sm dark:bg-emerald-950 dark:text-emerald-300">
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
          <h3 className="mb-6 font-display text-olive-950 text-xl tracking-tight dark:text-olive-100">
            Roadmap
          </h3>
          <div className="space-y-8">
            <div className="space-y-4" id="list-roadmap">
              <h4 className="font-semibold text-lg">
                <code className="mr-2 rounded bg-emerald-100 px-2 py-1 text-emerald-700 text-sm dark:bg-emerald-950 dark:text-emerald-300">
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
          <h3 className="mb-6 font-display text-olive-950 text-xl tracking-tight dark:text-olive-100">
            Subscriptions
          </h3>
          <div className="space-y-8">
            <div className="space-y-4" id="subscribe">
              <h4 className="font-semibold text-lg">
                <code className="mr-2 rounded bg-blue-100 px-2 py-1 text-blue-700 text-sm dark:bg-blue-950 dark:text-blue-300">
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

      {/* Rate Limiting */}
      <section className="mb-12">
        <h2
          className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100"
          id="rate-limiting"
        >
          Rate Limiting
        </h2>
        <p className="mb-4 text-muted-foreground text-sm">
          API requests are rate limited per API key. When you exceed the limit,
          requests will return a{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">429</code>{" "}
          status code. Check the response headers to monitor your usage.
        </p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Header</th>
                <th className="px-4 py-2 text-left font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b">
                <td className="px-4 py-2">
                  <code className="text-foreground text-xs">
                    X-RateLimit-Limit
                  </code>
                </td>
                <td className="px-4 py-2">
                  Maximum number of requests allowed per window.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2">
                  <code className="text-foreground text-xs">
                    X-RateLimit-Remaining
                  </code>
                </td>
                <td className="px-4 py-2">
                  Number of requests remaining in the current window.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Error Format */}
      <section className="mb-12">
        <h2
          className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100"
          id="errors"
        >
          Errors
        </h2>
        <p className="mb-4 text-muted-foreground text-sm">
          All error responses follow a consistent JSON format with an{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">error</code>{" "}
          field describing the issue.
        </p>
        <pre className={`mb-6 ${codeBlockClass}`}>
          <code>{`{
  "error": "Error message description"
}`}</code>
        </pre>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Status Code</th>
                <th className="px-4 py-2 text-left font-medium">Meaning</th>
                <th className="px-4 py-2 text-left font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b">
                <td className="px-4 py-2">
                  <code className="text-foreground text-xs">400</code>
                </td>
                <td className="px-4 py-2">Bad Request</td>
                <td className="px-4 py-2">
                  The request body or parameters are invalid.
                </td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-2">
                  <code className="text-foreground text-xs">401</code>
                </td>
                <td className="px-4 py-2">Unauthorized</td>
                <td className="px-4 py-2">Missing or invalid API key.</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-2">
                  <code className="text-foreground text-xs">404</code>
                </td>
                <td className="px-4 py-2">Not Found</td>
                <td className="px-4 py-2">
                  The requested resource does not exist.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2">
                  <code className="text-foreground text-xs">429</code>
                </td>
                <td className="px-4 py-2">Rate Limited</td>
                <td className="px-4 py-2">
                  Too many requests. Wait and retry after the rate limit window
                  resets.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
