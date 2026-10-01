import { DocsLink } from "@/components/docs/docs-page";
import { InlineCode } from "@/components/ui/typography";
import { BASE_URL, type EndpointDefinition, param } from "./endpoint-data";

const RATE_LIMITED = (
  <>
    Counts against the{" "}
    <DocsLink href="#rate-limiting">write rate limit</DocsLink>.
  </>
);

const SIGNED_USER_ACCESS = (
  <>
    Public or secret key, plus a{" "}
    <DocsLink href="#user-token">signed user token</DocsLink> in{" "}
    <InlineCode>X-User-Token</InlineCode>. Without one the request fails with{" "}
    <InlineCode>401</InlineCode>.
  </>
);

const FEEDBACK_ID_PARAM = param(
  "feedbackId",
  "string",
  "Required. The feedback ID."
);

const CREATE_FEEDBACK: EndpointDefinition = {
  access: (
    <>
      Public or secret key; a public key can post to a private organization too.
      A user token, signed or not, credits the post to that user and adds their
      upvote. <InlineCode>internal: true</InlineCode> needs the secret key.{" "}
      {RATE_LIMITED}
    </>
  ),
  body: `{
  "title": "Add dark mode",
  "description": "Please add a dark mode option.",
  "tagId": "kt31…",
  "context": { "url": "https://app.acme.com/settings", "browser": "Chrome 128" }
}`,
  description: "Create a feedback item.",
  id: "create-feedback",
  method: "POST",
  note: (
    <>
      Responds with <InlineCode>201</InlineCode> and{" "}
      <InlineCode>isApproved: false</InlineCode>: every new item waits for
      automatic triage, which publishes it shortly unless the board requires
      approval or the item looks like spam. Until then only the secret key reads
      it. Publish or reject it yourself with the secret key:{" "}
      <InlineCode>POST /api/v1/admin/feedback/publication</InlineCode> with{" "}
      <InlineCode>{`{ "feedbackId", "state": "approved" | "rejected" }`}</InlineCode>
      . Rejecting archives the item, so it leaves every read until someone
      restores it.
    </>
  ),
  params: [
    param("title", "string", "Required."),
    param("description", "string", "Required."),
    param("tagId", "string", "Tag to file it under."),
    param(
      "internal",
      "boolean",
      "Team-only feedback. Secret key only; never shown on the public board."
    ),
    param(
      "context",
      "object",
      "Where it was reported: url, pageTitle, browser, os, device, viewport, metadata and more."
    ),
  ],
  path: "/feedback/create",
  request: `curl -X POST "${BASE_URL}/feedback/create" \\
  -H "Authorization: Bearer fb_pub_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Add dark mode", "description": "Please add a dark mode option."}'`,
  response: `{
  "feedbackId": "jd7f2k9m1qz8x4c6v0bn3t5w",
  "isApproved": false
}`,
};

const VOTE_FEEDBACK: EndpointDefinition = {
  access: (
    <>{SIGNED_USER_ACCESS} A public key only votes on a public organization.</>
  ),
  body: `{
  "feedbackId": "jd7f2k9m1qz8x4c6v0bn3t5w",
  "voteType": "upvote"
}`,
  description:
    "Toggle the user’s vote. Sending the same vote again removes it; sending the other type switches it.",
  id: "vote-feedback",
  method: "POST",
  params: [
    FEEDBACK_ID_PARAM,
    param("voteType", "string", "upvote (default) or downvote."),
  ],
  path: "/feedback/vote",
  request: `curl -X POST "${BASE_URL}/feedback/vote" \\
  -H "Authorization: Bearer fb_pub_xxx" \\
  -H "X-User-Token: $USER_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"feedbackId": "jd7f2k9m1qz8x4c6v0bn3t5w"}'`,
  response: `{
  "voteCount": 43,
  "voted": true
}`,
};

const ADD_COMMENT: EndpointDefinition = {
  access: (
    <>
      {SIGNED_USER_ACCESS} {RATE_LIMITED}
    </>
  ),
  body: `{
  "feedbackId": "jd7f2k9m1qz8x4c6v0bn3t5w",
  "body": "We need this for late-night shifts.",
  "parentId": "kc81…"
}`,
  description: "Comment on a feedback item as the user.",
  id: "add-comment",
  method: "POST",
  note: (
    <>
      Responds with <InlineCode>201</InlineCode>.
    </>
  ),
  params: [
    FEEDBACK_ID_PARAM,
    param("body", "string", "Required. The comment text."),
    param("parentId", "string", "Comment to reply to."),
  ],
  path: "/feedback/comment",
  request: `curl -X POST "${BASE_URL}/feedback/comment" \\
  -H "Authorization: Bearer fb_pub_xxx" \\
  -H "X-User-Token: $USER_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"feedbackId": "jd7f2k9m1qz8x4c6v0bn3t5w", "body": "We need this too."}'`,
  response: `{
  "id": "kc83…"
}`,
};

const SUBSCRIBE: EndpointDefinition = {
  access: SIGNED_USER_ACCESS,
  body: `{
  "feedbackId": "jd7f2k9m1qz8x4c6v0bn3t5w"
}`,
  description: "Subscribe the user to updates on a feedback item.",
  id: "subscribe",
  method: "POST",
  params: [FEEDBACK_ID_PARAM],
  path: "/feedback/subscribe",
  request: `curl -X POST "${BASE_URL}/feedback/subscribe" \\
  -H "Authorization: Bearer fb_pub_xxx" \\
  -H "X-User-Token: $USER_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"feedbackId": "jd7f2k9m1qz8x4c6v0bn3t5w"}'`,
  response: `{
  "subscribed": true,
  "alreadySubscribed": false
}`,
};

const UNSUBSCRIBE: EndpointDefinition = {
  access: SIGNED_USER_ACCESS,
  body: `{
  "feedbackId": "jd7f2k9m1qz8x4c6v0bn3t5w"
}`,
  description: "Stop sending the user updates on a feedback item.",
  id: "unsubscribe",
  method: "POST",
  params: [FEEDBACK_ID_PARAM],
  path: "/feedback/unsubscribe",
  request: `curl -X POST "${BASE_URL}/feedback/unsubscribe" \\
  -H "Authorization: Bearer fb_pub_xxx" \\
  -H "X-User-Token: $USER_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"feedbackId": "jd7f2k9m1qz8x4c6v0bn3t5w"}'`,
  response: `{
  "unsubscribed": true
}`,
};

const SCREENSHOT_UPLOAD_URL: EndpointDefinition = {
  access: <>Public or secret key. {RATE_LIMITED}</>,
  description: (
    <>
      Get a one-time URL to upload a screenshot. <InlineCode>POST</InlineCode>{" "}
      the image bytes to it with the image’s{" "}
      <InlineCode>Content-Type</InlineCode>; it answers with a{" "}
      <InlineCode>storageId</InlineCode> to pass to{" "}
      <DocsLink href="#save-screenshot">save</DocsLink>.
    </>
  ),
  id: "screenshot-upload-url",
  method: "POST",
  path: "/feedback/screenshot/upload-url",
  request: `curl -X POST "${BASE_URL}/feedback/screenshot/upload-url" \\
  -H "Authorization: Bearer fb_pub_xxx"`,
  response: `{
  "uploadUrl": "https://harmless-clam-802.convex.cloud/api/storage/upload?token=…"
}`,
};

const SAVE_SCREENSHOT: EndpointDefinition = {
  access: <>Public or secret key.</>,
  body: `{
  "feedbackId": "jd7f2k9m1qz8x4c6v0bn3t5w",
  "storageId": "kg2a…",
  "width": 1440,
  "height": 900,
  "pageUrl": "https://app.acme.com/settings"
}`,
  description: (
    <>
      Attach an uploaded screenshot to a feedback item. The upload must be a
      PNG, JPEG, WebP, GIF or AVIF image of 10 MB or less, uploaded in the last
      30 minutes and not attached anywhere else; type and size are read from the
      upload. With a public key, only the reporter (same{" "}
      <InlineCode>X-User-Token</InlineCode> user, or anonymous for anonymous
      reports) can attach, within 30 minutes of creating the feedback, and at
      most 10 screenshots per feedback item.
    </>
  ),
  id: "save-screenshot",
  method: "POST",
  params: [
    FEEDBACK_ID_PARAM,
    param("storageId", "string", "Required. From the upload response."),
    param("filename", "string", "Defaults to screenshot.png."),
    param("width", "number", "Image width in pixels."),
    param("height", "number", "Image height in pixels."),
    param("pageUrl", "string", "Page the screenshot was taken on."),
    param("captureSource", "string", "widget (default) or element."),
    param(
      "annotatedStorageId",
      "string",
      "A second upload with the annotations drawn in."
    ),
    param(
      "annotations",
      "array",
      "Up to 50 shapes: rectangle, arrow, text, blur, pen, highlight or spotlight."
    ),
  ],
  path: "/feedback/screenshot/save",
  request: `curl -X POST "${BASE_URL}/feedback/screenshot/save" \\
  -H "Authorization: Bearer fb_pub_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"feedbackId": "jd7f2k9m1qz8x4c6v0bn3t5w", "storageId": "kg2a…"}'`,
  response: `{
  "screenshotId": "ks55…"
}`,
};

export const FEEDBACK_WRITE_ENDPOINTS = [
  CREATE_FEEDBACK,
  VOTE_FEEDBACK,
  ADD_COMMENT,
  SUBSCRIBE,
  UNSUBSCRIBE,
] as const;

export const SCREENSHOT_ENDPOINTS = [
  SCREENSHOT_UPLOAD_URL,
  SAVE_SCREENSHOT,
] as const;
