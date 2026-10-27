import type { Metadata } from "next";
import { CodeBlock } from "@/components/docs/code-block";
import {
  DocsLink,
  DocsList,
  DocsPage,
  DocsSection,
  DocsText,
} from "@/components/docs/docs-page";
import { ReferenceTable } from "@/components/docs/reference-table";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Read and write feedback with the Reflet client, attach screenshots, and handle errors.",
  path: "/docs/sdk/client",
  title: "SDK client",
});

const SECTIONS = [
  { id: "reads", label: "Read feedback and releases" },
  { id: "writes", label: "Submit and respond" },
  { id: "screenshots", label: "Attach a screenshot" },
  { id: "errors", label: "Handle errors" },
] as const;

const COLUMNS = [
  { kind: "name", label: "Method" },
  { kind: "text", label: "Result and behavior" },
] as const;

const READS = [
  {
    cells: [
      "getConfig()",
      "Organization name, branding, settings, and custom statuses.",
    ],
    key: "getConfig",
  },
  {
    cells: [
      "list(params?)",
      "{ items, total, hasMore }. Filter and paginate with the options below.",
    ],
    key: "list",
  },
  {
    cells: [
      "get(feedbackId)",
      "Feedback detail including hasVoted and isSubscribed. Throws RefletNotFoundError for a missing item.",
    ],
    key: "get",
  },
  {
    cells: [
      "getComments(feedbackId, sortBy?)",
      "Comments with nested replies. sortBy is oldest (default) or newest.",
    ],
    key: "getComments",
  },
  {
    cells: ["getRoadmap()", "{ lanes }, each with id, name, color, and items."],
    key: "getRoadmap",
  },
  {
    cells: [
      "getChangelog(limit?)",
      "Published changelog entries with linked feedback items.",
    ],
    key: "getChangelog",
  },
] as const;

const WRITES = [
  {
    cells: [
      "create({ title, description, context? })",
      "{ feedbackId, isApproved }. Anonymous or attributed creation; approval can keep the item off the public board.",
    ],
    key: "create",
  },
  {
    cells: [
      "vote(feedbackId, type?)",
      "{ voted, voteCount }. type is upvote (default) or downvote. Repeating the active vote toggles it off.",
    ],
    key: "vote",
  },
  {
    cells: [
      "comment({ feedbackId, body, parentId? })",
      "{ commentId }. Set parentId to reply to a comment.",
    ],
    key: "comment",
  },
  {
    cells: [
      "subscribe(feedbackId)",
      "{ subscribed, alreadySubscribed? }. Subscribe the identified user to updates.",
    ],
    key: "subscribe",
  },
  {
    cells: [
      "unsubscribe(feedbackId)",
      "{ unsubscribed, wasNotSubscribed? }. Remove that subscription.",
    ],
    key: "unsubscribe",
  },
] as const;

const READING = `import { Reflet } from "reflet-sdk";

const reflet = new Reflet({ publicKey: "fb_pub_YOUR_PUBLIC_KEY" });
const page = await reflet.list({
  search: "filters",
  sortBy: "votes",
  limit: 20,
  offset: 0,
});

if (page.hasMore) {
  const nextPage = await reflet.list({
    search: "filters",
    sortBy: "votes",
    limit: 20,
    offset: 20,
  });
}`;

const RESPONDING = `import { Reflet } from "reflet-sdk";

export async function respondToFeedback(token: string, feedbackId: string) {
  const reflet = new Reflet({
    publicKey: "fb_pub_YOUR_PUBLIC_KEY",
    userToken: token, // Signed by your authenticated server.
  });

  const vote = await reflet.vote(feedbackId);
  const { commentId } = await reflet.comment({
    feedbackId,
    body: "This also happens when I return from a bookmarked item.",
  });
  await reflet.subscribe(feedbackId);
  return { vote, commentId };
}`;

const SCREENSHOT = `import { Reflet } from "reflet-sdk";

export async function attachScreenshot(
  reflet: Reflet,
  feedbackId: string,
  image: Blob,
) {
  const { uploadUrl } = await reflet.getScreenshotUploadUrl();
  const upload = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": image.type },
    body: image,
  });
  if (!upload.ok) {
    throw new Error(\`Screenshot upload failed (\${upload.status})\`);
  }

  const result: unknown = await upload.json();
  if (
    typeof result !== "object" || result === null ||
    !("storageId" in result) || typeof result.storageId !== "string"
  ) {
    throw new Error("Screenshot upload returned no storageId");
  }

  return await reflet.saveScreenshot({
    feedbackId,
    storageId: result.storageId,
    mimeType: image.type,
    size: image.size,
    captureSource: "widget",
  });
}`;

const ERRORS = `import { Reflet, RefletError } from "reflet-sdk";

const reflet = new Reflet({ publicKey: "fb_pub_YOUR_PUBLIC_KEY" });

try {
  await reflet.create({
    title: "Keep my filters",
    description: "Filters reset after opening an item.",
  });
} catch (error) {
  if (error instanceof RefletError) {
    // status 0 means the network request failed.
    // Use status to choose UI copy; message contains the API's explanation.
    throw new Error(\`Feedback was not sent (\${error.status}): \${error.message}\`);
  }
  throw error;
}`;

export default function SdkClientPage() {
  return (
    <DocsPage
      description="Use the core client from browser or server code. Configure access first; each method returns a promise."
      sections={SECTIONS}
      title="SDK client"
    >
      <DocsSection id="reads" sections={SECTIONS}>
        <DocsText>
          Follow{" "}
          <DocsLink href="/docs/sdk/installation">
            installation and identity
          </DocsLink>{" "}
          before calling the client. Public keys see only the feedback exposed
          by the public API; a customer token does not unlock internal items.
        </DocsText>
        <ReferenceTable columns={COLUMNS} rows={READS} />
        <CodeBlock code={READING} />
        <DocsText>
          List options are <code>search</code> (title and description),{" "}
          <code>status</code> (<code>open</code>, <code>under_review</code>,{" "}
          <code>planned</code>, <code>in_progress</code>, <code>completed</code>
          , or <code>closed</code>), <code>statusId</code> (custom status),{" "}
          <code>sortBy</code> (<code>votes</code>, <code>newest</code>,{" "}
          <code>oldest</code>, or <code>comments</code>), <code>limit</code> (at
          most 100), and <code>offset</code>.
        </DocsText>
      </DocsSection>
      <DocsSection id="writes" sections={SECTIONS}>
        <ReferenceTable columns={COLUMNS} rows={WRITES} />
        <DocsText>
          All writes except creation need a server-signed user token. Passing{" "}
          <code>user</code> is not enough. See{" "}
          <DocsLink href="/docs/sdk/installation#user-signing">
            trusted identity
          </DocsLink>
          .
        </DocsText>
        <CodeBlock code={RESPONDING} />
        <DocsText>
          Optional creation context can include page information, metadata,
          selected elements, and console warnings/errors. The core client does
          not collect these automatically. For a capture UI, use the{" "}
          <DocsLink href="/docs/widget/floating-feedback">
            floating feedback widget
          </DocsLink>
          . Survey client methods are documented in{" "}
          <DocsLink href="/docs/sdk/surveys#javascript-client">
            surveys
          </DocsLink>
          .
        </DocsText>
      </DocsSection>
      <DocsSection id="screenshots" sections={SECTIONS}>
        <DocsText>
          Upload bytes to the one-shot storage URL, then attach the returned
          storage ID to an existing feedback item. <code>saveScreenshot</code>{" "}
          returns <code>{"{ screenshotId }"}</code>. Upload and attachment are
          separate operations; a failed attachment does not mean feedback
          creation failed.
        </DocsText>
        <CodeBlock code={SCREENSHOT} />
        <DocsText>
          Other attachment fields are <code>filename</code>, <code>width</code>,{" "}
          <code>height</code>, <code>pageUrl</code>,{" "}
          <code>annotatedStorageId</code>, and <code>annotations</code>. Use{" "}
          <code>captureSource: "element"</code> for a selected-element close-up.
          The published declarations include the annotation shape. Review and
          redact images before upload; direct client calls do not apply widget
          capture protections.
        </DocsText>
      </DocsSection>
      <DocsSection id="errors" sections={SECTIONS}>
        <CodeBlock code={ERRORS} />
        <DocsList>
          <li>
            <code>RefletError</code> exposes <code>status</code>,{" "}
            <code>message</code>, and optional <code>code</code>.
          </li>
          <li>
            HTTP 401 becomes <code>RefletAuthError</code>; HTTP 404 becomes{" "}
            <code>RefletNotFoundError</code>. Other HTTP failures, including
            400, are <code>RefletError</code>. Do not rely on the exported{" "}
            <code>RefletValidationError</code> for API validation failures.
          </li>
          <li>
            Network failures have status 0. Invalid JSON also throws{" "}
            <code>RefletError</code> with the response status.
          </li>
          <li>
            403 can indicate an origin or access restriction. 429 can indicate a
            rate limit or write quota. Keep the returned message visible and
            consult the <DocsLink href="/docs/api">API guide</DocsLink>.
          </li>
          <li>
            The client has no automatic retry or request cache. Do not blindly
            repeat creation or comments after an uncertain network failure.
          </li>
        </DocsList>
      </DocsSection>
    </DocsPage>
  );
}
