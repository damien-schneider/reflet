import { ArrowUpRight, Code2, Plus } from "lucide-react";
import Link from "next/link";
import { FeatureExplorer } from "@/features/homepage/components/experience/features/feature-explorer";
import { MARKETING_FAQ } from "@/features/homepage/components/experience/marketing-faq-data";
import { MarketingSectionIntro } from "@/features/homepage/components/experience/marketing-section-intro";
import { SectionReveal } from "@/features/homepage/components/experience/motion/section-reveal";

export function MarketingSections() {
  return (
    <section className="marketing-section marketing-features" id="features">
      <MarketingSectionIntro
        kicker="A conversation worth having"
        title={
          <>
            Feedback that
            <br />
            <span>goes somewhere.</span>
          </>
        }
      >
        Collect. Plan. Ship. Keep everyone in the loop.
      </MarketingSectionIntro>
      <SectionReveal>
        <FeatureExplorer />
      </SectionReveal>
      <SectionReveal>
        <DeveloperIntegration />
      </SectionReveal>
    </section>
  );
}

export function MarketingFaq() {
  return (
    <section className="marketing-section marketing-faq">
      <SectionReveal sequence>
        <span className="marketing-kicker">A few good questions</span>
        <h2>
          Before you
          <br />
          come full circle.
        </h2>
      </SectionReveal>
      <SectionReveal sequence>
        {MARKETING_FAQ.map((item) => (
          <details key={item.question}>
            <summary>
              {item.question}
              <Plus aria-hidden="true" size={17} />
            </summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </SectionReveal>
    </section>
  );
}

function DeveloperIntegration() {
  return (
    <article className="marketing-developer">
      <div>
        <span className="marketing-kicker">At home in your product</span>
        <h3>
          Your app.
          <br />
          Your feedback experience.
        </h3>
        <p>
          Use the React SDK to put feedback where it makes sense. Build your own
          experience with the API on Pro.
        </p>
        <Link className="marketing-text-link" href="/docs">
          Read the integration guide{" "}
          <ArrowUpRight aria-hidden="true" size={14} />
        </Link>
      </div>
      <div className="marketing-code">
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
      </div>
    </article>
  );
}
