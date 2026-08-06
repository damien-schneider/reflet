import type { Metadata } from "next";

import { generatePageMetadata } from "@/lib/seo-config";
import { codeBlockClass } from "./code-block-class";
import { EndpointsSection } from "./endpoints-section";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Full API for managing feedback, votes, comments, changelog, and roadmap programmatically.",
  keywords: [
    "rest api",
    "api reference",
    "feedback api",
    "changelog api",
    "roadmap api",
    "endpoints",
  ],
  path: "/docs/api",
  title: "REST API Reference",
});

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

      <EndpointsSection />

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
