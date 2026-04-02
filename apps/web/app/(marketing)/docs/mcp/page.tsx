import {
  EXAMPLE_PROMPTS,
  IDE_CONFIGS,
} from "@app/(marketing)/docs/mcp/_components/mcp-docs-data";
import { McpToolsReferenceSection } from "@app/(marketing)/docs/mcp/_components/mcp-tools-reference-section";
import type { Metadata } from "next";
import Link from "next/link";
import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  title: "MCP Server",
  description:
    "Connect AI coding assistants to Reflet via the Model Context Protocol. Manage feedback, releases, milestones and more from Cursor, VS Code, Claude Code and other AI tools.",
  path: "/docs/mcp",
  keywords: [
    "mcp",
    "model context protocol",
    "ai",
    "cursor",
    "claude code",
    "vs code copilot",
    "ai integration",
    "feedback automation",
  ],
});

export default function McpDocsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
        MCP Server
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-xl">
        Connect AI coding assistants to your Reflet workspace via the{" "}
        <a
          className="underline underline-offset-4 hover:text-foreground"
          href="https://modelcontextprotocol.io"
          rel="noopener noreferrer"
          target="_blank"
        >
          Model Context Protocol
        </a>
        . Manage feedback, releases, milestones, and more directly from your
        editor.
      </p>

      {/* Prerequisites */}
      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Prerequisites
        </h2>
        <ul className="list-inside list-disc space-y-2 text-muted-foreground text-sm">
          <li>
            A Reflet account with an organization (
            <Link
              className="underline underline-offset-4 hover:text-foreground"
              href="/auth/sign-up"
            >
              sign up
            </Link>
            )
          </li>
          <li>
            An API secret key — generate one in{" "}
            <strong className="text-foreground">Dashboard → In-App</strong>
          </li>
          <li>
            Node.js 18+ (the server runs via <InlineCode>npx</InlineCode>)
          </li>
          <li>A supported IDE: Cursor, VS Code, Claude Code, or Windsurf</li>
        </ul>
      </section>

      {/* Setup */}
      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Setup
        </h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Create the MCP configuration file for your editor. Replace{" "}
          <InlineCode>your-secret-key</InlineCode> with your actual secret key.
        </p>
        <div className="space-y-6">
          {IDE_CONFIGS.map((ide) => (
            <div key={ide.name}>
              <h3 className="mb-1 font-semibold text-foreground text-sm">
                {ide.name}
              </h3>
              <p className="mb-2 text-muted-foreground text-xs">{ide.file}</p>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <pre className="overflow-x-auto text-sm">
                  <code>{ide.config}</code>
                </pre>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-muted-foreground text-sm">
          Restart your IDE after adding the configuration. The Reflet tools will
          appear in your agent&apos;s available tools.
        </p>
      </section>

      {/* Example Prompts */}
      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Example prompts
        </h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Try these prompts in your AI assistant after connecting the MCP
          server. More suggestions are available in your{" "}
          <strong className="text-foreground">Dashboard → AI → Prompts</strong>{" "}
          tab.
        </p>
        <div className="space-y-4">
          {EXAMPLE_PROMPTS.map((example) => (
            <div
              className="rounded-lg border border-border p-4"
              key={example.title}
            >
              <h3 className="mb-1 font-semibold text-foreground text-sm">
                {example.title}
              </h3>
              <p className="font-mono text-muted-foreground text-xs leading-relaxed">
                {example.prompt}
              </p>
            </div>
          ))}
        </div>
      </section>

      <McpToolsReferenceSection />

      {/* Environment Variables */}
      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Environment variables
        </h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Variable</th>
                <th className="px-4 py-2 text-left font-medium">Required</th>
                <th className="px-4 py-2 text-left font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-2">
                  <InlineCode>REFLET_SECRET_KEY</InlineCode>
                </td>
                <td className="px-4 py-2 text-muted-foreground">Yes</td>
                <td className="px-4 py-2 text-muted-foreground">
                  Your API secret key from Dashboard → In-App
                </td>
              </tr>
              <tr className="bg-muted/20">
                <td className="px-4 py-2">
                  <InlineCode>REFLET_BASE_URL</InlineCode>
                </td>
                <td className="px-4 py-2 text-muted-foreground">No</td>
                <td className="px-4 py-2 text-muted-foreground">
                  Override the API base URL (self-hosted only)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Links */}
      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Resources
        </h2>
        <ul className="list-inside list-disc space-y-2 text-muted-foreground text-sm">
          <li>
            <a
              className="underline underline-offset-4 hover:text-foreground"
              href="https://modelcontextprotocol.io"
              rel="noopener noreferrer"
              target="_blank"
            >
              Model Context Protocol specification
            </a>
          </li>
          <li>
            <Link
              className="underline underline-offset-4 hover:text-foreground"
              href="/docs/api"
            >
              REST API documentation
            </Link>
          </li>
          <li>
            <Link
              className="underline underline-offset-4 hover:text-foreground"
              href="/docs/sdk"
            >
              SDK documentation
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
