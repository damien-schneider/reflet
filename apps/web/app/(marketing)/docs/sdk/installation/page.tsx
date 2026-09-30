import type { Metadata } from "next";

import { CodeBlock } from "@/components/docs/code-block";
import { DocsPage, DocsSection, DocsText } from "@/components/docs/docs-page";
import { InstallCommand } from "@/components/docs/install-command";
import { PropsTable } from "@/components/docs/props-table";
import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description: "Install and configure the Reflet SDK in your application.",
  path: "/docs/sdk/installation",
  title: "SDK installation",
});

const SECTIONS = [
  { id: "install", label: "Install" },
  { id: "configuration", label: "Configuration" },
  { id: "options", label: "Configuration options" },
  { id: "user-signing", label: "Server-side user signing" },
] as const;

const CONFIG = `import { Reflet } from "reflet-sdk";

const reflet = new Reflet({
  publicKey: "fb_pub_xxx", // from your Reflet dashboard
  user: {
    id: "user_123",
    email: "user@example.com",
    name: "Jane Doe",
  },
});`;

const SIGNING = `// Server
import { signUser } from "reflet-sdk/server";

const { token } = signUser(
  { id: user.id, email: user.email, name: user.name },
  process.env.REFLET_SECRET_KEY!
);

// Client
const reflet = new Reflet({
  publicKey: "fb_pub_xxx",
  userToken: token, // from your server
});`;

const OPTIONS = [
  {
    description: "Your organization’s public API key, starting with fb_pub_.",
    name: "publicKey",
    required: true,
    type: "string",
  },
  {
    description: "Identifies the current user for SSO.",
    name: "user",
    type: "RefletUser",
  },
  {
    description: "A token signed on your server. Use instead of user.",
    name: "userToken",
    type: "string",
  },
  {
    default: "Reflet production API",
    description: "Where requests are sent.",
    name: "baseUrl",
    type: "string",
  },
] as const;

export default function SdkInstallationPage() {
  return (
    <DocsPage
      description="Install the Reflet SDK and configure it for your project."
      sections={SECTIONS}
      title="SDK installation"
    >
      <DocsSection id="install" sections={SECTIONS}>
        <InstallCommand command="npm install reflet-sdk" />
        <DocsText>Also works with yarn, pnpm and bun.</DocsText>
      </DocsSection>

      <DocsSection id="configuration" sections={SECTIONS}>
        <DocsText>Create a client with your public API key.</DocsText>
        <CodeBlock code={CONFIG} />
      </DocsSection>

      <DocsSection id="options" sections={SECTIONS}>
        <PropsTable props={OPTIONS} />
      </DocsSection>

      <DocsSection id="user-signing" sections={SECTIONS}>
        <DocsText>
          For secure SSO, sign the user on your server with your secret key and
          pass the resulting token to the client as{" "}
          <InlineCode>userToken</InlineCode>.
        </DocsText>
        <CodeBlock code={SIGNING} />
      </DocsSection>
    </DocsPage>
  );
}
