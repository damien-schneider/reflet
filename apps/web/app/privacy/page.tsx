import type { Metadata } from "next";
import Link from "next/link";

import { H1, H2, H3, Lead, Text } from "@/components/ui/typography";

export const metadata: Metadata = {
  title: "Privacy Policy | Reflet",
  description:
    "Learn how Reflet collects, uses, and protects your personal information.",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <header className="mb-12">
          <Link
            className="text-muted-foreground text-sm hover:text-foreground"
            href="/"
          >
            &larr; Back to Reflet
          </Link>
          <H1 className="mt-6" variant="page">
            Privacy Policy
          </H1>
          <Lead className="mt-4">Effective Date: February 3, 2025</Lead>
          <Text className="mt-2 text-muted-foreground">
            Damien Schneider EI, France
          </Text>
        </header>

        <article className="space-y-10">
          <section>
            <Text>
              This Privacy Policy describes how Reflet (&quot;we,&quot;
              &quot;us,&quot; or &quot;our&quot;) collects, uses, and shares
              information about you when you use our product feedback and
              roadmap management platform (the &quot;Service&quot;).
            </Text>
          </section>

          <section className="space-y-4">
            <H2>1. Information We Collect</H2>

            <H3 className="text-lg">Account Information</H3>
            <Text>
              When you create an account, we collect your email address, name
              (optional), and password (stored in hashed form). If you sign in
              via GitHub OAuth, we also receive your GitHub username, avatar,
              and account type.
            </Text>

            <H3 className="text-lg">Organization Data</H3>
            <Text>
              When you create or join an organization, we collect the
              organization name, slug, logo, branding preferences (colors,
              custom CSS), and team member information including roles and email
              addresses.
            </Text>

            <H3 className="text-lg">Feedback and Content</H3>
            <Text>
              We collect feedback titles, descriptions, status updates, votes,
              comments, importance ratings, and any other content you submit
              through the Service.
            </Text>

            <H3 className="text-lg">Widget and Visitor Data</H3>
            <Text>
              When users interact with embedded Reflet widgets, we collect
              visitor identifiers (for anonymous users), user agent strings,
              page URLs, referrer information, and any external user metadata
              provided by the host application.
            </Text>

            <H3 className="text-lg">Support Conversations</H3>
            <Text>
              If you use our support chat feature, we collect conversation
              messages, status information, and message reactions.
            </Text>

            <H3 className="text-lg">Usage and Technical Data</H3>
            <Text>
              We automatically collect API request logs including IP addresses,
              endpoints accessed, HTTP methods, status codes, and timestamps. We
              also collect session data to keep you logged in.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>2. How We Use Your Information</H2>
            <Text>We use the information we collect to:</Text>
            <ul className="list-disc space-y-2 pl-6 text-foreground">
              <li>Provide, maintain, and improve the Service</li>
              <li>Process transactions and send related notifications</li>
              <li>Send you technical notices, updates, and support messages</li>
              <li>Respond to your comments, questions, and requests</li>
              <li>
                Provide AI-powered features such as feedback clarification,
                draft replies, and difficulty estimation
              </li>
              <li>Monitor and analyze trends, usage, and activities</li>
              <li>Detect, investigate, and prevent security incidents</li>
            </ul>
          </section>

          <section className="space-y-4">
            <H2>3. Information Sharing</H2>
            <Text>
              We share your information with the following third-party service
              providers who assist us in operating the Service:
            </Text>

            <div className="overflow-x-auto">
              <table className="mt-4 w-full border-collapse text-sm">
                <thead>
                  <tr className="border-border border-b">
                    <th className="px-4 py-2 text-left font-semibold">
                      Service
                    </th>
                    <th className="px-4 py-2 text-left font-semibold">
                      Purpose
                    </th>
                    <th className="px-4 py-2 text-left font-semibold">
                      Data Shared
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-4 py-2">Stripe</td>
                    <td className="px-4 py-2">Payment processing</td>
                    <td className="px-4 py-2">
                      Customer ID, subscription details
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Resend</td>
                    <td className="px-4 py-2">Email delivery</td>
                    <td className="px-4 py-2">
                      Email addresses, notification content
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Convex</td>
                    <td className="px-4 py-2">Database and backend</td>
                    <td className="px-4 py-2">
                      All user and organization data
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">GitHub</td>
                    <td className="px-4 py-2">OAuth and issue sync</td>
                    <td className="px-4 py-2">Account info, repository data</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Google / Anthropic</td>
                    <td className="px-4 py-2">AI features</td>
                    <td className="px-4 py-2">
                      Feedback content for processing
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <Text className="mt-4">
              We may also share information when required by law, to protect our
              rights, or in connection with a business transfer.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>4. Data Retention</H2>
            <Text>
              We retain your information for as long as your account is active
              or as needed to provide the Service:
            </Text>
            <ul className="list-disc space-y-2 pl-6 text-foreground">
              <li>Session data: 30 days</li>
              <li>Account data: Until you delete your account</li>
              <li>
                Feedback and organization data: For the lifetime of the
                organization
              </li>
              <li>API logs: 90 days</li>
            </ul>
          </section>

          <section className="space-y-4">
            <H2>5. Your Rights</H2>

            <H3 className="text-lg">For EU Residents (GDPR)</H3>
            <Text>You have the right to:</Text>
            <ul className="list-disc space-y-2 pl-6 text-foreground">
              <li>Access your personal data</li>
              <li>Rectify inaccurate data</li>
              <li>Request erasure (&quot;right to be forgotten&quot;)</li>
              <li>Restrict processing</li>
              <li>Data portability</li>
              <li>Object to processing</li>
              <li>Withdraw consent at any time</li>
            </ul>

            <H3 className="mt-4 text-lg">For California Residents (CCPA)</H3>
            <Text>You have the right to:</Text>
            <ul className="list-disc space-y-2 pl-6 text-foreground">
              <li>Know what personal information we collect</li>
              <li>Delete your personal information</li>
              <li>Opt-out of the sale of personal information</li>
              <li>Non-discrimination for exercising your rights</li>
            </ul>
            <Text className="mt-2">
              We do not sell personal information as defined by the CCPA.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>6. International Data Transfers</H2>
            <Text>
              Your information may be transferred to and processed in countries
              other than your own, including the United States. We rely on
              Standard Contractual Clauses and other lawful mechanisms to
              transfer data outside the European Economic Area.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>7. Security</H2>
            <Text>
              We implement appropriate technical and organizational measures to
              protect your information, including encryption in transit (TLS),
              secure password hashing, role-based access controls, and regular
              security reviews.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>8. Children&apos;s Privacy</H2>
            <Text>
              The Service is not intended for children under 16. We do not
              knowingly collect personal information from children. If you
              believe we have collected such information, please contact us
              immediately.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>9. Changes to This Policy</H2>
            <Text>
              We may update this Privacy Policy from time to time. We will
              notify you of material changes by posting the new policy on this
              page and updating the effective date. Your continued use of the
              Service after changes constitutes acceptance of the updated
              policy.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>10. Contact Us</H2>
            <Text>
              If you have questions about this Privacy Policy or wish to
              exercise your rights, please contact us at:
            </Text>
            <Text className="mt-2">
              <strong>Email:</strong>{" "}
              <a
                className="text-olive-600 underline hover:text-olive-700 dark:text-olive-400"
                href="mailto:legal@reflet.app"
              >
                legal@reflet.app
              </a>
            </Text>
            <Text>
              <strong>Entity:</strong> Damien Schneider EI, France
            </Text>
          </section>
        </article>

        <footer className="mt-16 border-border border-t pt-8">
          <div className="flex flex-wrap gap-4 text-muted-foreground text-sm">
            <Link className="hover:text-foreground" href="/terms">
              Terms of Service
            </Link>
            <Link className="hover:text-foreground" href="/cookies">
              Cookie Policy
            </Link>
            <Link className="hover:text-foreground" href="/">
              Back to Reflet
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
