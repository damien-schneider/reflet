import { ApiAdditionalEndpoints } from "@app/(marketing)/docs/api/_components/api-additional-endpoints";
import { ApiAuthenticationSection } from "@app/(marketing)/docs/api/_components/api-authentication-section";
import { ApiCommentsEndpoints } from "@app/(marketing)/docs/api/_components/api-comments-endpoints";
import { ApiErrorCodesSection } from "@app/(marketing)/docs/api/_components/api-error-codes-section";
import { ApiFeedbackEndpoints } from "@app/(marketing)/docs/api/_components/api-feedback-endpoints";
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

      <ApiAuthenticationSection />

      <section className="mb-12">
        <h2
          className="mb-6 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100"
          id="endpoints"
        >
          Endpoints
        </h2>

        <div className="mb-10">
          <h3 className="mb-6 font-display text-olive-950 text-xl tracking-tight dark:text-olive-100">
            Feedback
          </h3>
          <div className="space-y-8">
            <ApiFeedbackEndpoints />
            <ApiCommentsEndpoints />
          </div>
        </div>

        <ApiAdditionalEndpoints />
      </section>

      <ApiErrorCodesSection />
    </div>
  );
}
