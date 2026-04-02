import { CODE_BLOCK_CLASS } from "@app/(marketing)/docs/api/_components/api-docs-styles";
import { cn } from "@/lib/utils";

export function ApiAuthenticationSection() {
  return (
    <>
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
            <pre className={cn("mt-3", CODE_BLOCK_CLASS)}>
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
            <pre className={cn("mt-3", CODE_BLOCK_CLASS)}>
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

      <section className="mb-12">
        <h2
          className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100"
          id="base-url"
        >
          Base URL
        </h2>
        <pre className={CODE_BLOCK_CLASS}>
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
    </>
  );
}
