import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ctrl-ui/react/ui/table";

import { LegalContactSection } from "@/features/homepage/components/legal-contact-section";
import { LegalDocument } from "@/features/homepage/components/legal-document";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata = generatePageMetadata({
  description:
    "Learn how Reflet collects, uses, and protects your personal information. Understand your GDPR and CCPA privacy rights and how to request data deletion.",
  path: "/privacy",
  title: "Privacy policy",
});

const THIRD_PARTY_SERVICES = [
  {
    dataShared: "Customer ID, subscription details",
    purpose: "Payment processing",
    service: "Stripe",
  },
  {
    dataShared: "Email addresses, notification content",
    purpose: "Email delivery",
    service: "Resend",
  },
  {
    dataShared: "All user and organization data",
    purpose: "Database and backend",
    service: "Convex",
  },
  {
    dataShared: "Account info, repository data",
    purpose: "OAuth and issue sync",
    service: "GitHub",
  },
  {
    dataShared: "Account info, feedback content for AI processing",
    purpose: "OAuth and AI features",
    service: "Google",
  },
  {
    dataShared: "Feedback content for processing",
    purpose: "AI features",
    service: "Anthropic",
  },
];

export default function PrivacyPolicy() {
  return (
    <LegalDocument
      effectiveDate="February 20, 2026"
      path="/privacy"
      title="Privacy policy"
    >
      <section>
        <p>
          This Privacy Policy describes how Reflet (“we,” “us,” or “our”)
          collects, uses, and shares information about you when you use our
          product feedback and roadmap management platform (the “Service”).
        </p>
      </section>

      <section>
        <h2>1. Information we collect</h2>

        <h3>Account information</h3>
        <p>
          When you create an account, we collect your email address, name
          (optional), and password (stored in hashed form). If you sign in via
          GitHub OAuth, we also receive your GitHub username, avatar, and
          account type. If you sign in via Google OAuth, we receive your Google
          email address, name, and profile picture.
        </p>

        <h3>Organization data</h3>
        <p>
          When you create or join an organization, we collect the organization
          name, slug, logo, branding preferences (colors, custom CSS), and team
          member information including roles and email addresses.
        </p>

        <h3>Feedback and content</h3>
        <p>
          We collect feedback titles, descriptions, status updates, votes,
          comments, importance ratings, and any other content you submit through
          the Service.
        </p>

        <h3>Widget and visitor data</h3>
        <p>
          When users interact with embedded Reflet widgets, we collect visitor
          identifiers (for anonymous users), user agent strings, page URLs,
          referrer information, and any external user metadata provided by the
          host application.
        </p>

        <h3>Support conversations</h3>
        <p>
          If you use our support chat feature, we collect conversation messages,
          status information, and message reactions.
        </p>

        <h3>Usage and technical data</h3>
        <p>
          We automatically collect API request logs including IP addresses,
          endpoints accessed, HTTP methods, status codes, and timestamps. We
          also collect session data to keep you logged in.
        </p>
      </section>

      <section>
        <h2>2. How we use your information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, maintain, and improve the Service</li>
          <li>Process transactions and send related notifications</li>
          <li>Send you technical notices, updates, and support messages</li>
          <li>Respond to your comments, questions, and requests</li>
          <li>
            Provide AI-powered features such as feedback clarification, draft
            replies, and difficulty estimation
          </li>
          <li>Monitor and analyze trends, usage, and activities</li>
          <li>Detect, investigate, and prevent security incidents</li>
        </ul>
      </section>

      <section>
        <h2>3. Information sharing</h2>
        <p>
          We share your information with the following third-party service
          providers who assist us in operating the Service:
        </p>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Data shared</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {THIRD_PARTY_SERVICES.map((entry) => (
                <TableRow key={entry.service}>
                  <TableCell>{entry.service}</TableCell>
                  <TableCell className="whitespace-normal">
                    {entry.purpose}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {entry.dataShared}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <p>
          We may also share information when required by law, to protect our
          rights, or in connection with a business transfer.
        </p>
      </section>

      <section>
        <h2>4. Data retention</h2>
        <p>
          We retain your information for as long as your account is active or as
          needed to provide the Service:
        </p>
        <ul>
          <li>Session data: 30 days</li>
          <li>Account data: Until you delete your account</li>
          <li>
            Feedback and organization data: For the lifetime of the organization
          </li>
          <li>API logs: 90 days</li>
        </ul>
      </section>

      <section>
        <h2>5. Your rights</h2>

        <h3>For EU residents (GDPR)</h3>
        <p>You have the right to:</p>
        <ul>
          <li>Access your personal data</li>
          <li>Rectify inaccurate data</li>
          <li>Request erasure (“right to be forgotten”)</li>
          <li>Restrict processing</li>
          <li>Data portability</li>
          <li>Object to processing</li>
          <li>Withdraw consent at any time</li>
        </ul>

        <h3>For California residents (CCPA)</h3>
        <p>You have the right to:</p>
        <ul>
          <li>Know what personal information we collect</li>
          <li>Delete your personal information</li>
          <li>Opt-out of the sale of personal information</li>
          <li>Non-discrimination for exercising your rights</li>
        </ul>
        <p>We do not sell personal information as defined by the CCPA.</p>
      </section>

      <section>
        <h2>6. International data transfers</h2>
        <p>
          Your information may be transferred to and processed in countries
          other than your own, including the United States. We rely on Standard
          Contractual Clauses and other lawful mechanisms to transfer data
          outside the European Economic Area.
        </p>
      </section>

      <section>
        <h2>7. Security</h2>
        <p>
          We implement appropriate technical and organizational measures to
          protect your information, including encryption in transit (TLS),
          secure password hashing, role-based access controls, and regular
          security reviews.
        </p>
      </section>

      <section>
        <h2>8. Children’s privacy</h2>
        <p>
          The Service is not intended for children under 16. We do not knowingly
          collect personal information from children. If you believe we have
          collected such information, please contact us immediately.
        </p>
      </section>

      <section>
        <h2>9. Changes to this policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify
          you of material changes by posting the new policy on this page and
          updating the effective date. Your continued use of the Service after
          changes constitutes acceptance of the updated policy.
        </p>
      </section>

      <LegalContactSection heading="10. Contact us">
        If you have questions about this Privacy Policy or wish to exercise your
        rights, please contact us at:
      </LegalContactSection>
    </LegalDocument>
  );
}
