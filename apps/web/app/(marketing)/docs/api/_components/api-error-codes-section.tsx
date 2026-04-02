import { CODE_BLOCK_CLASS } from "@app/(marketing)/docs/api/_components/api-docs-styles";
import { cn } from "@/lib/utils";

export function ApiErrorCodesSection() {
  return (
    <>
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

      {/* Errors */}
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
        <pre className={cn("mb-6", CODE_BLOCK_CLASS)}>
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
    </>
  );
}
