import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ctrl-ui/react/ui/table";
import Link from "next/link";

import { H1, H2, H3, Lead, Text } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata = generatePageMetadata({
  description:
    "Learn how Reflet uses essential, functional, and analytics cookies. Find out which third-party services may set cookies and how to manage your preferences.",
  path: "/cookies",
  title: "Cookie Policy | Reflet",
});

export default function CookiePolicy() {
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
            Cookie Policy
          </H1>
          <Lead className="mt-4">Effective Date: February 20, 2026</Lead>
          <Text className="mt-2 text-muted-foreground">
            Damien Schneider EI, France
          </Text>
        </header>

        <article className="space-y-10">
          <section>
            <Text>
              This Cookie Policy explains how Reflet (&quot;we,&quot;
              &quot;us,&quot; or &quot;our&quot;) uses cookies and similar
              technologies when you visit our website or use our Service.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>1. What Are Cookies?</H2>
            <Text>
              Cookies are small text files placed on your device when you visit
              a website. They help websites remember your preferences, keep you
              logged in, and understand how you use the site. Similar
              technologies include local storage, session storage, and tracking
              pixels.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>2. Types of Cookies We Use</H2>

            <H3 className="text-lg">Essential Cookies</H3>
            <Text>
              These cookies are necessary for the Service to function and cannot
              be disabled. They include:
            </Text>
            <Table className="mt-4 text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Cookie</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono text-xs">
                    better-auth.session_token
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    Keeps you logged in to your account
                  </TableCell>
                  <TableCell className="tabular-nums">30 days</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">
                    better-auth.csrf_token
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    Protects against cross-site request forgery attacks
                  </TableCell>
                  <TableCell className="tabular-nums">Session</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <H3 className="mt-6 text-lg">Functional Cookies</H3>
            <Text>
              These cookies enable enhanced functionality and personalization:
            </Text>
            <Table className="mt-4 text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Cookie</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono text-xs">theme</TableCell>
                  <TableCell className="whitespace-normal">
                    Remembers your light/dark mode preference
                  </TableCell>
                  <TableCell className="tabular-nums">1 year</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <H3 className="mt-6 text-lg">Analytics Cookies</H3>
            <Text>
              We use privacy-focused analytics to understand how visitors use
              our website:
            </Text>
            <Table className="mt-4 text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Privacy Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Umami</TableCell>
                  <TableCell className="whitespace-normal">
                    Privacy-focused website analytics
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    No personal data collected, no cookies stored
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Text className="mt-2 text-muted-foreground">
              Umami is a privacy-focused analytics solution that does not use
              cookies or collect personal information.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>3. Local Storage</H2>
            <Text>
              In addition to cookies, we use browser local storage to save
              certain preferences and improve your experience:
            </Text>
            <ul className="list-disc space-y-2 pl-6 text-foreground">
              <li>
                <strong>Theme preference:</strong> Your light/dark mode
                selection
              </li>
              <li>
                <strong>UI state:</strong> Sidebar collapsed state, panel sizes
              </li>
              <li>
                <strong>Draft content:</strong> Unsaved form data (temporarily)
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <H2>4. Third-Party Cookies</H2>
            <Text>
              Some third-party services we integrate may set their own cookies:
            </Text>
            <ul className="list-disc space-y-2 pl-6 text-foreground">
              <li>
                <strong>Stripe:</strong> Payment processing cookies for checkout
                sessions
              </li>
              <li>
                <strong>Google:</strong> OAuth authentication cookies when
                signing in with your Google account
              </li>
              <li>
                <strong>GitHub:</strong> OAuth authentication cookies when
                connecting your GitHub account
              </li>
            </ul>
            <Text className="mt-2">
              These cookies are governed by the respective third-party privacy
              policies:
            </Text>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
              <li>
                <a
                  className="text-brand-text underline hover:text-brand-text/80"
                  href="https://stripe.com/privacy"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Stripe Privacy Policy
                </a>
              </li>
              <li>
                <a
                  className="text-brand-text underline hover:text-brand-text/80"
                  href="https://policies.google.com/privacy"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Google Privacy Policy
                </a>
              </li>
              <li>
                <a
                  className="text-brand-text underline hover:text-brand-text/80"
                  href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  GitHub Privacy Statement
                </a>
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <H2>5. Embedded Widgets</H2>
            <Text>
              When Reflet widgets are embedded on third-party websites, the
              following data may be collected:
            </Text>
            <ul className="list-disc space-y-2 pl-6 text-foreground">
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
            <Text className="mt-2">
              This data is used to enable feedback submission and support
              conversations. It is not used for cross-site tracking.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>6. Managing Cookies</H2>
            <Text>
              You can control cookies through your browser settings. Most
              browsers allow you to:
            </Text>
            <ul className="list-disc space-y-2 pl-6 text-foreground">
              <li>View what cookies are stored</li>
              <li>Delete individual or all cookies</li>
              <li>Block cookies from specific or all websites</li>
              <li>Set preferences for cookie acceptance</li>
            </ul>
            <Text className="mt-4">
              Please note that blocking essential cookies may prevent you from
              using certain features of the Service, including logging in.
            </Text>

            <Text className="mt-4">
              For more information on managing cookies in popular browsers:
            </Text>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
              <li>
                <a
                  className="text-brand-text underline hover:text-brand-text/80"
                  href="https://support.google.com/chrome/answer/95647"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Google Chrome
                </a>
              </li>
              <li>
                <a
                  className="text-brand-text underline hover:text-brand-text/80"
                  href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Mozilla Firefox
                </a>
              </li>
              <li>
                <a
                  className="text-brand-text underline hover:text-brand-text/80"
                  href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Safari
                </a>
              </li>
              <li>
                <a
                  className="text-brand-text underline hover:text-brand-text/80"
                  href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Microsoft Edge
                </a>
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <H2>7. Do Not Track</H2>
            <Text>
              Our Service does not currently respond to Do Not Track (DNT)
              browser signals. However, we use privacy-focused analytics that do
              not track individual users across websites.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>8. Changes to This Policy</H2>
            <Text>
              We may update this Cookie Policy from time to time. We will notify
              you of material changes by posting the updated policy and changing
              the effective date. Your continued use of the Service after
              changes constitutes acceptance.
            </Text>
          </section>

          <section className="space-y-4">
            <H2>9. Contact Us</H2>
            <Text>
              If you have questions about this Cookie Policy, please contact us
              at:
            </Text>
            <Text className="mt-2">
              <strong>Email:</strong>{" "}
              <a
                className="text-brand-text underline hover:text-brand-text/80"
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
            <Link className="hover:text-foreground" href="/terms">
              Terms of Service
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
