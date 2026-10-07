import { ArrowUpRight, Code2, Plus } from "lucide-react";
import Link from "next/link";
import { FeatureExplorer } from "@/features/homepage/components/experience/features/feature-explorer";
import { MARKETING_FAQ } from "@/features/homepage/components/experience/marketing-faq-data";
import { MarketingSectionIntro } from "@/features/homepage/components/experience/marketing-section-intro";

export function MarketingSections() {
  return (
    <section className="marketing-section marketing-features" id="features">
      <FeatureExplorer>
        <MarketingSectionIntro
          align="start"
          kicker="Features"
          title={
            <>
              Feedback that
              <br />
              <span>goes somewhere.</span>
            </>
          }
        >
          A widget for your users, a board for your team, and a changelog for
          everyone who asked.
        </MarketingSectionIntro>
      </FeatureExplorer>
      <DeveloperIntegration />
    </section>
  );
}

export function MarketingFaq() {
  return (
    <section className="marketing-section marketing-faq">
      <div>
        <span className="marketing-kicker">FAQ</span>
        <h2>Common questions</h2>
      </div>
      <div>
        {MARKETING_FAQ.map((item) => (
          <details key={item.question}>
            <summary>
              {item.question}
              <Plus aria-hidden="true" size={17} />
            </summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function DeveloperIntegration() {
  return (
    <article className="marketing-developer">
      <div>
        <span className="marketing-kicker">For developers</span>
        <h3>Put feedback inside your app.</h3>
        <p>
          Use the React SDK to put feedback where it makes sense. Build your own
          experience with the API on Pro.
        </p>
        <Link className="marketing-text-link" href="/docs">
          Read the integration guide{" "}
          <ArrowUpRight aria-hidden="true" size={14} />
        </Link>
      </div>
      <figure aria-label="React SDK setup example" className="marketing-code">
        <div>
          <span>
            <Code2 aria-hidden="true" size={14} /> your-app.tsx
          </span>
          <span>React SDK</span>
        </div>
        <pre>
          <code>
            {
              'import { RefletProvider, FeedbackButton }\n  from "reflet-sdk/react";\n\n<RefletProvider publicKey="your-public-key">\n  <App />\n  <FeedbackButton />\n</RefletProvider>'
            }
          </code>
        </pre>
      </figure>
    </article>
  );
}
