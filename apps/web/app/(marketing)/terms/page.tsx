import { LegalContactSection } from "@/features/homepage/components/legal-contact-section";
import { LegalDocument } from "@/features/homepage/components/legal-document";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata = generatePageMetadata({
  description:
    "Read the terms and conditions for using Reflet. Covers acceptable use, subscriptions, billing, open source licensing under SSPL, data ownership, and your rights.",
  path: "/terms",
  title: "Terms of service",
});

export default function TermsOfService() {
  return (
    <LegalDocument
      effectiveDate="February 20, 2026"
      path="/terms"
      title="Terms of service"
    >
      <section>
        <p>
          These Terms of Service (“Terms”) govern your access to and use of
          Reflet, a product feedback and roadmap management platform operated by
          Damien Schneider EI (“we,” “us,” or “our”). By using our Service, you
          agree to these Terms.
        </p>
      </section>

      <section>
        <h2>1. Acceptance of terms</h2>
        <p>
          By creating an account or using the Service, you agree to be bound by
          these Terms and our Privacy Policy. If you are using the Service on
          behalf of an organization, you represent that you have authority to
          bind that organization to these Terms.
        </p>
      </section>

      <section>
        <h2>2. Description of service</h2>
        <p>
          Reflet provides a platform for collecting and managing product
          feedback, maintaining public roadmaps, publishing changelogs, and
          facilitating customer communication. Features include:
        </p>
        <ul>
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

      <section>
        <h2>3. Account registration</h2>
        <p>
          You must provide accurate and complete information when creating an
          account. You are responsible for maintaining the security of your
          account credentials and for all activities that occur under your
          account. You must notify us immediately of any unauthorized use.
        </p>
      </section>

      <section>
        <h2>4. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>
            Use the Service for any unlawful purpose or in violation of any
            applicable laws
          </li>
          <li>
            Post content that is defamatory, obscene, abusive, or infringes on
            intellectual property rights
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
        <p>
          We reserve the right to suspend or terminate accounts that violate
          these rules without prior notice.
        </p>
      </section>

      <section>
        <h2>5. User content</h2>
        <p>
          You retain ownership of content you submit to the Service. By
          submitting content, you grant us a worldwide, non-exclusive,
          royalty-free license to use, store, display, and distribute that
          content solely to provide and improve the Service.
        </p>
        <p>
          You are responsible for ensuring you have the necessary rights to
          submit content and that it does not violate any third-party rights.
        </p>
      </section>

      <section>
        <h2>6. Subscription and billing</h2>
        <p>
          Reflet offers free and paid subscription plans. Paid plans are billed
          on a monthly or annual basis through Stripe. By subscribing to a paid
          plan, you agree to:
        </p>
        <ul>
          <li>Pay all applicable fees at the current rates</li>
          <li>Provide accurate billing information</li>
          <li>
            Authorize us to charge your payment method on a recurring basis
          </li>
        </ul>
        <p>
          You may cancel your subscription at any time through your account
          settings. Upon cancellation, you will retain access until the end of
          your current billing period.
        </p>
        <p>
          We reserve the right to change pricing with 30 days’ notice. Continued
          use after a price change constitutes acceptance of the new pricing.
        </p>
      </section>

      <section>
        <h2>7. Free tier limitations</h2>
        <p>The free tier is subject to the following limitations:</p>
        <ul>
          <li>Maximum 3 team members per organization</li>
          <li>Maximum 100 feedback items</li>
          <li>No custom branding</li>
          <li>No custom domain</li>
          <li>No API access</li>
        </ul>
        <p>We may modify these limitations at any time.</p>
      </section>

      <section>
        <h2>8. API usage</h2>
        <p>
          API access is available to Pro plan subscribers. By using our API, you
          agree to:
        </p>
        <ul>
          <li>Keep your API keys confidential and secure</li>
          <li>Comply with rate limits and usage guidelines</li>
          <li>
            Not use the API in ways that could harm the Service or other users
          </li>
        </ul>
        <p>We may revoke API access for violations of these terms.</p>
      </section>

      <section>
        <h2>9. Open source license</h2>
        <p>
          Reflet is open source software licensed under the Server Side Public
          License (SSPL). If you self-host Reflet, you must comply with the SSPL
          terms. For commercial licensing inquiries, contact us at{" "}
          <a href="mailto:licensing@reflet.app">licensing@reflet.app</a>.
        </p>
      </section>

      <section>
        <h2>10. Intellectual property</h2>
        <p>
          The Service, including its design, features, and documentation, is
          owned by us and protected by intellectual property laws. These Terms
          do not grant you any rights to our trademarks, logos, or branding.
        </p>
      </section>

      <section>
        <h2>11. Third-party services</h2>
        <p>
          The Service integrates with third-party services including Google,
          GitHub, Stripe, and AI providers. Your use of these integrations is
          subject to the respective third-party terms of service. We are not
          responsible for third-party services.
        </p>
      </section>

      <section>
        <h2>12. Disclaimer of warranties</h2>
        <p>
          THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES
          OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS
          FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT
          THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
        </p>
      </section>

      <section>
        <h2>13. Limitation of liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY
          INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR
          ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE
          SERVICE.
        </p>
        <p>
          OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM THESE TERMS OR THE
          SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE MONTHS
          PRECEDING THE CLAIM.
        </p>
      </section>

      <section>
        <h2>14. Indemnification</h2>
        <p>
          You agree to indemnify and hold us harmless from any claims, damages,
          or expenses (including legal fees) arising from your use of the
          Service, your content, or your violation of these Terms.
        </p>
      </section>

      <section>
        <h2>15. Termination</h2>
        <p>
          You may terminate your account at any time by contacting us. We may
          suspend or terminate your account for violations of these Terms or for
          any reason with reasonable notice. Upon termination, your right to use
          the Service ceases immediately.
        </p>
      </section>

      <section>
        <h2>16. Governing law</h2>
        <p>
          These Terms are governed by the laws of France. Any disputes shall be
          resolved in the courts of France. If you are a consumer in the
          European Union, you may also bring claims in your country of
          residence.
        </p>
      </section>

      <section>
        <h2>17. Changes to terms</h2>
        <p>
          We may modify these Terms at any time. We will notify you of material
          changes by posting the updated Terms and changing the effective date.
          Your continued use of the Service after changes constitutes acceptance
          of the modified Terms.
        </p>
      </section>

      <section>
        <h2>18. Severability</h2>
        <p>
          If any provision of these Terms is found to be unenforceable, the
          remaining provisions will continue in full force and effect.
        </p>
      </section>

      <LegalContactSection heading="19. Contact us">
        If you have questions about these Terms, please contact us at:
      </LegalContactSection>
    </LegalDocument>
  );
}
