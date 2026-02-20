import type { Metadata } from "next";
import Link from "next/link";

import { H1, H2, Lead, Text } from "@/components/ui/typography";

export const metadata: Metadata = {
  title: "Terms of Service | Reflet",
  description:
    "Read the terms and conditions for using the Reflet product feedback platform.",
};

export default function TermsOfService() {
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
            Terms of Service
          </H1>
          <Lead className="mt-4">Effective Date: February 20, 2026</Lead>
          <Text className="mt-2 text-muted-foreground">
            Damien Schneider EI, France
          </Text>
        </header>

        <article className="space-y-10">
          <section>
            <Text>
              These Terms of Service (&quot;Terms&quot;) govern your access to
              and use of Reflet, a product feedback and roadmap management
              platform operated by Damien Schneider EI (&quot;we,&quot;
              &quot;us,&quot; or &quot;our&quot;). By using our Service, you
              agree to these Terms.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>1. Acceptance of Terms</H2>
            <Text>
              By creating an account or using the Service, you agree to be bound
              by these Terms and our Privacy Policy. If you are using the
              Service on behalf of an organization, you represent that you have
              authority to bind that organization to these Terms.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>2. Description of Service</H2>
            <Text>
              Reflet provides a platform for collecting and managing product
              feedback, maintaining public roadmaps, publishing changelogs, and
              facilitating customer communication. Features include:
            </Text>
            <ul className="list-disc space-y-2 pl-6 text-foreground">
              <li>Feedback collection and management</li>
              <li>Public and private roadmaps</li>
              <li>Changelog and release notes</li>
              <li>Embeddable widgets</li>
              <li>Team collaboration tools</li>
              <li>GitHub integration</li>
              <li>AI-powered features</li>
              <li>API access (Pro plan)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <H2>3. Account Registration</H2>
            <Text>
              You must provide accurate and complete information when creating
              an account. You are responsible for maintaining the security of
              your account credentials and for all activities that occur under
              your account. You must notify us immediately of any unauthorized
              use.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>4. Acceptable Use</H2>
            <Text>You agree not to:</Text>
            <ul className="list-disc space-y-2 pl-6 text-foreground">
              <li>
                Use the Service for any unlawful purpose or in violation of any
                applicable laws
              </li>
              <li>
                Post content that is defamatory, obscene, abusive, or infringes
                on intellectual property rights
              </li>
              <li>Harass, threaten, or intimidate other users</li>
              <li>
                Attempt to gain unauthorized access to the Service or related
                systems
              </li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>
                Use automated means to access the Service without our permission
                (except via our official API)
              </li>
              <li>Upload malware, viruses, or other malicious code</li>
              <li>Impersonate any person or entity</li>
              <li>Spam or send unsolicited communications</li>
            </ul>
            <Text className="mt-4">
              We reserve the right to suspend or terminate accounts that violate
              these rules without prior notice.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>5. User Content</H2>
            <Text>
              You retain ownership of content you submit to the Service. By
              submitting content, you grant us a worldwide, non-exclusive,
              royalty-free license to use, store, display, and distribute that
              content solely to provide and improve the Service.
            </Text>
            <Text className="mt-2">
              You are responsible for ensuring you have the necessary rights to
              submit content and that it does not violate any third-party
              rights.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>6. Subscription and Billing</H2>
            <Text>
              Reflet offers free and paid subscription plans. Paid plans are
              billed on a monthly or annual basis through Stripe. By subscribing
              to a paid plan, you agree to:
            </Text>
            <ul className="list-disc space-y-2 pl-6 text-foreground">
              <li>Pay all applicable fees at the current rates</li>
              <li>Provide accurate billing information</li>
              <li>
                Authorize us to charge your payment method on a recurring basis
              </li>
            </ul>
            <Text className="mt-4">
              You may cancel your subscription at any time through your account
              settings. Upon cancellation, you will retain access until the end
              of your current billing period.
            </Text>
            <Text className="mt-2">
              We reserve the right to change pricing with 30 days&apos; notice.
              Continued use after a price change constitutes acceptance of the
              new pricing.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>7. Free Tier Limitations</H2>
            <Text>The free tier is subject to the following limitations:</Text>
            <ul className="list-disc space-y-2 pl-6 text-foreground">
              <li>Maximum 3 team members per organization</li>
              <li>Maximum 100 feedback items</li>
              <li>No custom branding</li>
              <li>No custom domain</li>
              <li>No API access</li>
            </ul>
            <Text className="mt-2">
              We may modify these limitations at any time.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>8. API Usage</H2>
            <Text>
              API access is available to Pro plan subscribers. By using our API,
              you agree to:
            </Text>
            <ul className="list-disc space-y-2 pl-6 text-foreground">
              <li>Keep your API keys confidential and secure</li>
              <li>Comply with rate limits and usage guidelines</li>
              <li>
                Not use the API in ways that could harm the Service or other
                users
              </li>
            </ul>
            <Text className="mt-2">
              We may revoke API access for violations of these terms.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>9. Open Source License</H2>
            <Text>
              Reflet is open source software licensed under the Server Side
              Public License (SSPL). If you self-host Reflet, you must comply
              with the SSPL terms. For commercial licensing inquiries, contact
              us at{" "}
              <a
                className="text-olive-600 underline hover:text-olive-700 dark:text-olive-400"
                href="mailto:licensing@reflet.app"
              >
                licensing@reflet.app
              </a>
              .
            </Text>
          </section>

          <section className="space-y-4">
            <H2>10. Intellectual Property</H2>
            <Text>
              The Service, including its design, features, and documentation, is
              owned by us and protected by intellectual property laws. These
              Terms do not grant you any rights to our trademarks, logos, or
              branding.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>11. Third-Party Services</H2>
            <Text>
              The Service integrates with third-party services including Google,
              GitHub, Stripe, and AI providers. Your use of these integrations
              is subject to the respective third-party terms of service. We are
              not responsible for third-party services.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>12. Disclaimer of Warranties</H2>
            <Text>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
              AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
              IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR
              PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE
              WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>13. Limitation of Liability</H2>
            <Text>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR
              ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
              DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM
              YOUR USE OF THE SERVICE.
            </Text>
            <Text className="mt-2">
              OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM THESE TERMS OR THE
              SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE
              MONTHS PRECEDING THE CLAIM.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>14. Indemnification</H2>
            <Text>
              You agree to indemnify and hold us harmless from any claims,
              damages, or expenses (including legal fees) arising from your use
              of the Service, your content, or your violation of these Terms.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>15. Termination</H2>
            <Text>
              You may terminate your account at any time by contacting us. We
              may suspend or terminate your account for violations of these
              Terms or for any reason with reasonable notice. Upon termination,
              your right to use the Service ceases immediately.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>16. Governing Law</H2>
            <Text>
              These Terms are governed by the laws of France. Any disputes shall
              be resolved in the courts of France. If you are a consumer in the
              European Union, you may also bring claims in your country of
              residence.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>17. Changes to Terms</H2>
            <Text>
              We may modify these Terms at any time. We will notify you of
              material changes by posting the updated Terms and changing the
              effective date. Your continued use of the Service after changes
              constitutes acceptance of the modified Terms.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>18. Severability</H2>
            <Text>
              If any provision of these Terms is found to be unenforceable, the
              remaining provisions will continue in full force and effect.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>19. Contact Us</H2>
            <Text>
              If you have questions about these Terms, please contact us at:
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
            <Link className="hover:text-foreground" href="/privacy">
              Privacy Policy
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
