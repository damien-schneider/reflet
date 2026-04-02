import { TOOLS_REFERENCE } from "@app/(marketing)/docs/mcp/_components/mcp-docs-data";
import { InlineCode } from "@/components/ui/typography";

export function McpToolsReferenceSection() {
  return (
    <section className="mb-10">
      <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
        Tools reference
      </h2>
      <p className="mb-4 text-muted-foreground text-sm">
        The MCP server exposes 50+ tools organized by domain. Your AI assistant
        will automatically discover and use the right tools.
      </p>
      <div className="space-y-6">
        {TOOLS_REFERENCE.map((group) => (
          <div key={group.category}>
            <h3 className="mb-2 font-semibold text-foreground text-sm">
              {group.category}
            </h3>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <tbody>
                  {group.tools.map((tool, index) => (
                    <tr
                      className={
                        index % 2 === 0 ? "bg-muted/20" : "bg-background"
                      }
                      key={tool.name}
                    >
                      <td className="px-4 py-2">
                        <InlineCode>{tool.name}</InlineCode>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {tool.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
