import type { Metadata } from "next";
import {
  DocsLink,
  DocsList,
  DocsNote,
  DocsPage,
  DocsSection,
  DocsText,
} from "@/components/docs/docs-page";

export const metadata: Metadata = {
  description:
    "Set up a workspace, review feedback, plan work, and publish updates in Reflet.",
  title: "Using Reflet",
};

const SECTIONS = [
  { id: "first-feedback", label: "Collect your first feedback" },
  { id: "review", label: "Review and organize" },
  { id: "plan", label: "Plan work" },
  { id: "releases", label: "Publish an update" },
  { id: "support", label: "Reply to customers" },
  { id: "surveys", label: "Ask a question" },
  { id: "status", label: "Report service status" },
  { id: "settings", label: "Manage the workspace" },
] as const;

export default function UsingRefletPage() {
  return (
    <DocsPage
      description="A workspace holds your feedback, roadmap, releases, and customer conversations. Start with one request; add the other tools when you need them."
      sections={SECTIONS}
      title="Using Reflet"
    >
      <DocsSection id="first-feedback" sections={SECTIONS}>
        <DocsList>
          <li>
            <DocsLink href="/auth/sign-up">Create an account</DocsLink>, then
            create an organization from the workspace switcher.
          </li>
          <li>
            In Settings, General, choose a name, URL slug, and whether the
            organization is public. A private organization is only visible to
            its members.
          </li>
          <li>
            Add a feedback item from the board. Give it a short title and
            describe the situation and the result you want.
          </li>
          <li>
            For a public organization, share its public page. Visitors can read
            published feedback; signing in lets them submit, vote, and comment.
          </li>
        </DocsList>
        <DocsText>
          To collect requests inside your own app, install a{" "}
          <DocsLink href="/docs/widget">widget</DocsLink> or use the{" "}
          <DocsLink href="/docs/sdk/installation">SDK</DocsLink>. Team members
          can also record notes and voice sessions through the{" "}
          <DocsLink href="/docs/sdk/devtools">
            development and team tools
          </DocsLink>
          .
        </DocsText>
      </DocsSection>

      <DocsSection id="review" sections={SECTIONS}>
        <DocsText>
          Open a request to reply, assign it, and set its status, priority,
          tags, estimate, or deadline. Search and filter the board to find
          related requests. Use Duplicates to review suggested matches before
          merging; an AI suggestion does not merge them for you.
        </DocsText>
        <DocsText>
          If publication approval is enabled, new submissions wait in Feedback,
          Review. Approve to publish, or reject to move the request to Trash.
          Internal feedback stays off public pages even when approved. Workflow
          status and publication approval are separate decisions.
        </DocsText>
        <DocsNote>
          Making an organization public is not permission to publish everything
          inside it. Check each item's approval and internal visibility, and
          keep private information out of public comments and releases.
        </DocsNote>
        <DocsText>
          Owners and admins can restore archived feedback from Settings, Trash,
          or permanently delete it there. Permanent deletion cannot be undone.
        </DocsText>
      </DocsSection>

      <DocsSection id="plan" sections={SECTIONS}>
        <DocsText>
          Use the board view to move requests between status columns. Custom
          column names map to the workflow states: Open, Under review, Planned,
          In progress, Completed, and Closed.
        </DocsText>
        <DocsText>
          Use Milestones to group requests around a goal, time horizon, and
          optional target date. Choose which milestones are public. A milestone
          groups work; it does not replace the status of each request. Share the
          public roadmap when you want customers to see the plan.
        </DocsText>
        <DocsText>
          To let a coding agent claim work from the board, configure Developer,
          Agents &amp; CLI and follow the{" "}
          <DocsLink href="/docs/cli">CLI guide</DocsLink>. Confirming a session
          intention or adding it to the board does not authorize an agent to act
          on it.
        </DocsText>
      </DocsSection>

      <DocsSection id="releases" sections={SECTIONS}>
        <DocsText>
          In Changelog, Releases, create a draft and link the feedback it
          addresses. Write what changed for the reader, then publish now or
          schedule it. Drafts are not public. Before confirming, check the
          dialog's subscriber email, GitHub release, and linked-feedback
          effects.
        </DocsText>
        <DocsText>
          The public changelog and{" "}
          <DocsLink href="/docs/widget/changelog-widget">
            changelog widget
          </DocsLink>{" "}
          show published updates. Subscribers confirm their email address and
          can unsubscribe. Email analytics reports delivery and engagement when
          email is configured.
        </DocsText>
      </DocsSection>

      <DocsSection id="support" sections={SECTIONS}>
        <DocsText>
          Owners and admins handle customer conversations in Inbox. Open a
          conversation to reply, change its status, or create linked feedback
          when a support request needs product work.
        </DocsText>
        <DocsText>
          Enable the public support page from Inbox. For in-app chat, create a{" "}
          <DocsLink href="/docs/widget/live-chat">live chat</DocsLink> in
          Developer, In-app and copy its embed code. Support email is a separate
          setup in Settings, Support email; verify the domain and forwarding
          configuration shown there before relying on email replies.
        </DocsText>
      </DocsSection>

      <DocsSection id="surveys" sections={SECTIONS}>
        <DocsText>
          In Surveys, create a draft, add questions, and configure its audience,
          targeting, and display rules. Activate it when ready. Distribute a
          survey link or{" "}
          <DocsLink href="/docs/sdk/surveys">show it inside your app</DocsLink>.
          Pause or close it to stop collecting new responses.
        </DocsText>
        <DocsText>
          Open the survey to review responses and analytics or export CSV. Test
          with the intended audience: activation alone does not mean a
          respondent meets the targeting rules.
        </DocsText>
      </DocsSection>

      <DocsSection id="status" sections={SECTIONS}>
        <DocsText>
          In Status, add a URL monitor and configure its response checks. Choose
          which monitors are public. Use incidents for an outage and scheduled
          maintenance for planned work; update them as the situation changes.
        </DocsText>
        <DocsText>
          Configure alert channels for your team. Customers can subscribe from
          the public status page. Private organizations do not expose a public
          status page, and private monitors stay hidden.
        </DocsText>
      </DocsSection>

      <DocsSection id="settings" sections={SECTIONS}>
        <DocsList>
          <li>
            Members: invite people as admins or members. Owners and admins
            manage the workspace; membership does not grant access to another
            author's private session drafts.
          </li>
          <li>
            General and Domains: set visibility, logo, brand settings, and a
            custom domain. Follow the DNS records and verification status shown
            in the app. Some options require Pro.
          </li>
          <li>
            Developer, GitHub: connect a GitHub installation and select a
            repository. Configure release sync, issue sync, and label mappings
            there. If the member who linked it leaves, another member must
            reconnect it.
          </li>
          <li>
            Developer, API keys: create keys for integrations. Public keys
            belong in client apps; secret keys belong on servers or in a trusted
            CLI. See{" "}
            <DocsLink href="/docs/api">authentication and webhooks</DocsLink>.
          </li>
          <li>
            Billing: check current usage, plan limits, and subscription
            settings. Account settings hold your profile and notification
            preferences.
          </li>
        </DocsList>
        <DocsText>
          Missing an action? Check your organization role and{" "}
          <DocsLink href="/pricing">plan</DocsLink>. On a self-hosted
          deployment, email, AI, billing, and GitHub also need operator
          configuration.
        </DocsText>
      </DocsSection>
    </DocsPage>
  );
}
