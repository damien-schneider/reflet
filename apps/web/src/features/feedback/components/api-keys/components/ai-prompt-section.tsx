"use client";

import { Copy, Robot } from "@phosphor-icons/react";
import { useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateAiPrompt } from "../lib/generate-ai-prompt";

interface AiPromptSectionProps {
  publicKey: string;
}

export function AiPromptSection({ publicKey }: AiPromptSectionProps) {
  const prompt = generateAiPrompt(publicKey);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg">AI Integration Prompt</h3>
        <p className="mt-1 text-muted-foreground">
          Copy this prompt and paste it into Claude, ChatGPT, or any AI coding
          assistant to help implement the Reflet SDK in your application.
        </p>
      </div>

      <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-900 dark:bg-purple-950">
        <div className="flex items-start gap-3">
          <Robot className="mt-0.5 h-5 w-5 text-purple-600" />
          <div className="flex-1">
            <h4 className="font-medium text-purple-800 dark:text-purple-200">
              How to use this prompt
            </h4>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-purple-700 text-sm dark:text-purple-300">
              <li>Click the copy button below to copy the full prompt</li>
              <li>Open your preferred AI assistant (Claude, ChatGPT, etc.)</li>
              <li>Paste the prompt and describe your specific requirements</li>
              <li>The AI will generate customized code for your application</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="relative">
        <Button
          className="absolute top-3 right-3 z-10"
          onClick={() => copyToClipboard(prompt, "AI prompt")}
          size="sm"
          variant="secondary"
        >
          <Copy className="mr-2 h-4 w-4" />
          Copy Prompt
        </Button>
        <div className="max-h-96 overflow-auto rounded-lg bg-muted p-4 font-mono text-sm">
          <pre className="whitespace-pre-wrap">{prompt}</pre>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          className="flex-1"
          onClick={() => copyToClipboard(prompt, "AI prompt")}
          variant="default"
        >
          <Copy className="mr-2 h-4 w-4" />
          Copy Full Prompt
        </Button>
      </div>
    </div>
  );
}
