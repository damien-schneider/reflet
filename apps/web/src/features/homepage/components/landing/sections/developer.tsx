"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { H2 } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import { EASE_OUT_EXPO } from "../../../lib/motion";
import SdkResult from "../mockups/sdk-result";

const SNIPPETS = [
  {
    code: `import { FeedbackButton } from '@reflet/sdk/react'
<FeedbackButton publicKey="pk_live_…a3f" />`,
    file: "app.tsx",
    id: "react",
    label: "React",
    note: "Typed drop-in components.",
    renders: true,
  },
  {
    code: `<script
  src="https://cdn.reflet.app/widget.js"
  data-key="pk_live_…a3f"
  defer
></script>`,
    file: "index.html",
    id: "script",
    label: "Script tag",
    note: "One line, any site, no build.",
    renders: true,
  },
  {
    code: `curl https://api.reflet.app/v1/posts \\
  -H "Authorization: Bearer sk_live_…" \\
  -d title="Webhook on status change" \\
  -d board=feature-requests`,
    file: "terminal",
    id: "rest",
    label: "REST",
    note: "Anything that speaks HTTP.",
    renders: false,
  },
  {
    code: `{
  "mcpServers": {
    "reflet": { "command": "bunx", "args": ["@reflet/mcp"] }
  }
}`,
    file: "mcp.json",
    id: "mcp",
    label: "MCP",
    note: "Let your agent file the request.",
    renders: false,
  },
] as const;

const TOKEN_PATTERN =
  /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b(?:import|from|const|curl|defer)\b|<\/?[A-Za-z][\w.-]*)/g;

function tokenClass(token: string) {
  if (token.startsWith('"') || token.startsWith("'")) {
    return "text-olive-700 dark:text-olive-300";
  }
  if (token.startsWith("<")) {
    return "text-foreground";
  }
  return "text-muted-foreground";
}

function CodeLine({ line }: { line: string }) {
  return line
    .split(TOKEN_PATTERN)
    .filter(Boolean)
    .map((token, index) => (
      <span className={tokenClass(token)} key={token + String(index)}>
        {token}
      </span>
    ));
}

export default function LandingDeveloper() {
  const [activeId, setActiveId] =
    useState<(typeof SNIPPETS)[number]["id"]>("react");
  const [isCopied, setIsCopied] = useState(false);
  const active =
    SNIPPETS.find((snippet) => snippet.id === activeId) ?? SNIPPETS[0];

  const copyCode = async () => {
    await navigator.clipboard.writeText(active.code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1800);
  };

  const panel = (
    <motion.div
      className="flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_24px_60px_-32px_rgba(20,18,11,0.25)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_60px_-32px_rgba(0,0,0,0.8)]"
      layout
      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
    >
      <div className="flex items-center gap-4 border-border/70 border-b bg-muted/60 px-4 py-2.5 dark:bg-sidebar/60">
        <span className="font-mono text-[11px] text-muted-foreground">
          {active.file}
        </span>
        <div className="ml-auto flex h-7 items-center gap-3">
          {active.renders && <SdkResult />}
          <button
            aria-label="Copy snippet"
            className="relative flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors before:absolute before:-inset-1.5 before:content-[''] hover:text-foreground"
            onClick={copyCode}
            type="button"
          >
            {isCopied ? (
              <Check
                className="text-olive-600 dark:text-olive-400"
                size={13}
                weight="bold"
              />
            ) : (
              <Copy size={13} />
            )}
          </button>
        </div>
      </div>

      <motion.div className="relative flex flex-col overflow-hidden" layout>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.pre
            animate={{ opacity: 1, y: 0 }}
            className="overflow-x-auto p-7 pr-9 font-mono text-[12px] leading-7 sm:p-8 sm:pr-10 sm:text-[13px]"
            exit={{ opacity: 0, y: -8 }}
            initial={{ opacity: 0, y: 10 }}
            key={active.id}
            transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
          >
            {active.code.split("\n").map((line, index) => (
              <div className="flex" key={line + String(index)}>
                <span className="mr-4 inline-block w-4 select-none text-right text-[11px] text-muted-foreground">
                  {index + 1}
                </span>
                <span className="text-foreground/90">
                  <CodeLine line={line} />
                </span>
              </div>
            ))}
          </motion.pre>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );

  return (
    <section className="relative pt-32 pb-28 sm:pt-40 sm:pb-36">
      <div className="mx-auto max-w-220 px-5 sm:px-8">
        <div>
          <div className="mb-14 max-w-140 sm:mb-16">
            <H2 variant="landing">Two lines in, feedback out.</H2>
          </div>

          <div className="flex flex-col gap-8">
            <ol className="grid grid-cols-2 gap-x-10 sm:grid-cols-4 lg:grid-cols-4">
              {SNIPPETS.map((snippet) => {
                const isActive = snippet.id === activeId;
                return (
                  <li key={snippet.id}>
                    <button
                      aria-pressed={isActive}
                      className={cn(
                        "group relative block w-full cursor-pointer border-t py-4 text-left transition-colors",
                        isActive
                          ? "border-olive-600 dark:border-olive-300"
                          : "border-border"
                      )}
                      onClick={() => {
                        setActiveId(snippet.id);
                        setIsCopied(false);
                      }}
                      type="button"
                    >
                      <span
                        className={cn(
                          "block font-semibold text-[15px] transition-colors",
                          isActive
                            ? "text-foreground"
                            : "text-muted-foreground group-hover:text-foreground"
                        )}
                      >
                        {snippet.label}
                      </span>
                      <span className="mt-1 block text-[13px] text-muted-foreground leading-relaxed">
                        {snippet.note}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {panel}
          </div>
        </div>
      </div>
    </section>
  );
}
