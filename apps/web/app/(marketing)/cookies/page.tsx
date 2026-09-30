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
    "Learn how Reflet uses essential, functional, and analytics cookies. Find out which third-party services may set cookies and how to manage your preferences.",
  path: "/cookies",
  title: "Cookie policy",
});

interface CookieTableProps {
  columns: readonly [string, string, string];
  identifierColumn?: boolean;
  rows: readonly (readonly [string, string, string])[];
}

function CookieTable({ columns, identifierColumn, rows }: CookieTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(([name, purpose, detail]) => (
            <TableRow key={name}>
              <TableCell className={identifierColumn ? "font-mono" : undefined}>
                {name}
              </TableCell>
              <TableCell className="whitespace-normal">{purpose}</TableCell>
              <TableCell className="whitespace-normal tabular-nums">
                {detail}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

const COOKIE_COLUMNS = ["Cookie", "Purpose", "Duration"] as const;

const ESSENTIAL_COOKIES = [
  [
    "better-auth.session_token",
    "Keeps you logged in to your account",
    "30 days",
  ],
  [
    "better-auth.csrf_token",
    "Protects against cross-site request forgery attacks",
    "Session",
  ],
] as const;

const FUNCTIONAL_COOKIES = [
  ["theme", "Remembers your light/dark mode preference", "1 year"],
] as const;

const ANALYTICS_SERVICES = [
  [
    "Umami",
    "Privacy-focused website analytics",
    "No personal data collected, no cookies stored",
  ],
] as const;

export default function CookiePolicy() {
  return (
    <LegalDocument
      effectiveDate="February 20, 2026"
      path="/cookies"
      title="Cookie policy"
    >
      <section>
        <p>
          This Cookie Policy explains how Reflet (“we,” “us,” or “our”) uses
          cookies and similar technologies when you visit our website or use our
          Service.
        </p>
      </section>

      <section>
        <h2>1. What are cookies?</h2>
        <p>
          Cookies are small text files placed on your device when you visit a
          website. They help websites remember your preferences, keep you logged
          in, and understand how you use the site. Similar technologies include
          local storage, session storage, and tracking pixels.
        </p>
      </section>

      <section>
        <h2>2. Types of cookies we use</h2>

        <h3>Essential cookies</h3>
        <p>
          These cookies are necessary for the Service to function and cannot be
          disabled. They include:
        </p>
        <CookieTable
          columns={COOKIE_COLUMNS}
          identifierColumn
          rows={ESSENTIAL_COOKIES}
        />

        <h3>Functional cookies</h3>
        <p>These cookies enable enhanced functionality and personalization:</p>
        <CookieTable
          columns={COOKIE_COLUMNS}
          identifierColumn
          rows={FUNCTIONAL_COOKIES}
        />

        <h3>Analytics cookies</h3>
        <p>
          We use privacy-focused analytics to understand how visitors use our
          website:
        </p>
        <CookieTable
          columns={["Service", "Purpose", "Privacy note"]}
          rows={ANALYTICS_SERVICES}
        />
        <p>
          Umami is a privacy-focused analytics solution that does not use
          cookies or collect personal information.
        </p>
      </section>

      <section>
        <h2>3. Local storage</h2>
        <p>
          In addition to cookies, we use browser local storage to save certain
          preferences and improve your experience:
        </p>
        <ul>
          <li>
            <strong>Theme preference:</strong> Your light/dark mode selection
          </li>
          <li>
            <strong>UI state:</strong> Sidebar collapsed state, panel sizes
          </li>
          <li>
            <strong>Draft content:</strong> Unsaved form data (temporarily)
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Third-party cookies</h2>
        <p>Some third-party services we integrate may set their own cookies:</p>
        <ul>
          <li>
            <strong>Stripe:</strong> Payment processing cookies for checkout
            sessions
          </li>
          <li>
            <strong>Google:</strong> OAuth authentication cookies when signing
            in with your Google account
          </li>
          <li>
            <strong>GitHub:</strong> OAuth authentication cookies when
            connecting your GitHub account
          </li>
        </ul>
        <p>
          These cookies are governed by the respective third-party privacy
          policies:
        </p>
        <ul>
          <li>
            <a
              href="https://stripe.com/privacy"
              rel="noopener noreferrer"
              target="_blank"
            >
              Stripe Privacy Policy
            </a>
          </li>
          <li>
            <a
              href="https://policies.google.com/privacy"
              rel="noopener noreferrer"
              target="_blank"
            >
              Google Privacy Policy
            </a>
          </li>
          <li>
            <a
              href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement"
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub Privacy Statement
            </a>
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Embedded widgets</h2>
        <p>
          When Reflet widgets are embedded on third-party websites, the
          following data may be collected:
        </p>
        <ul>
          <li>
            <strong>Visitor ID:</strong> A randomly generated identifier for
            anonymous users
          </li>
          <li>
            <strong>Page URL:</strong> The URL where the widget is embedded
          </li>
          <li>
            <strong>User agent:</strong> Browser and device information
          </li>
        </ul>
        <p>
          This data is used to enable feedback submission and support
          conversations. It is not used for cross-site tracking.
        </p>
      </section>

      <section>
        <h2>6. Managing cookies</h2>
        <p>
          You can control cookies through your browser settings. Most browsers
          allow you to:
        </p>
        <ul>
          <li>View what cookies are stored</li>
          <li>Delete individual or all cookies</li>
          <li>Block cookies from specific or all websites</li>
          <li>Set preferences for cookie acceptance</li>
        </ul>
        <p>
          Please note that blocking essential cookies may prevent you from using
          certain features of the Service, including logging in.
        </p>

        <p>For more information on managing cookies in popular browsers:</p>
        <ul>
          <li>
            <a
              href="https://support.google.com/chrome/answer/95647"
              rel="noopener noreferrer"
              target="_blank"
            >
              Google Chrome
            </a>
          </li>
          <li>
            <a
              href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"
              rel="noopener noreferrer"
              target="_blank"
            >
              Mozilla Firefox
            </a>
          </li>
          <li>
            <a
              href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
              rel="noopener noreferrer"
              target="_blank"
            >
              Safari
            </a>
          </li>
          <li>
            <a
              href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
              rel="noopener noreferrer"
              target="_blank"
            >
              Microsoft Edge
            </a>
          </li>
        </ul>
      </section>

      <section>
        <h2>7. Do Not Track</h2>
        <p>
          Our Service does not currently respond to Do Not Track (DNT) browser
          signals. However, we use privacy-focused analytics that do not track
          individual users across websites.
        </p>
      </section>

      <section>
        <h2>8. Changes to this policy</h2>
        <p>
          We may update this Cookie Policy from time to time. We will notify you
          of material changes by posting the updated policy and changing the
          effective date. Your continued use of the Service after changes
          constitutes acceptance.
        </p>
      </section>

      <LegalContactSection heading="9. Contact us">
        If you have questions about this Cookie Policy, please contact us at:
      </LegalContactSection>
    </LegalDocument>
  );
}
