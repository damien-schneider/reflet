"use client";

import { Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { H3, Muted, Text } from "@/components/ui/typography";

interface LeadMagnetProps {
  title: string;
  description: string;
  fileName: string;
  fileType: "pdf" | "xlsx" | "zip";
  downloadUrl: string;
  variant?: "inline" | "card";
}

export function LeadMagnet({
  title,
  description,
  fileName,
  fileType,
  downloadUrl,
  variant = "card",
}: LeadMagnetProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call - in production, send to your email service
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setLoading(false);
    setSubmitted(true);

    // Trigger download
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName;
    link.click();
  };

  const fileIcons = {
    pdf: "PDF",
    xlsx: "XLS",
    zip: "ZIP",
  };

  if (variant === "inline") {
    return (
      <div className="my-6 flex items-center gap-4 rounded-lg border border-border bg-muted/50 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-olive-600/10">
          <FileText className="h-6 w-6 text-olive-600" />
        </div>
        <div className="flex-1">
          <Text className="font-medium">{title}</Text>
          <Muted>{fileIcons[fileType]} download</Muted>
        </div>
        {submitted ? (
          <Button disabled variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Downloaded
          </Button>
        ) : (
          <a download={fileName} href={downloadUrl}>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="my-8 rounded-xl border border-olive-200 bg-olive-50/50 p-6 dark:border-olive-800 dark:bg-olive-950/20">
      <div className="mb-4 flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-olive-600">
          <FileText className="h-6 w-6 text-white" />
        </div>
        <div>
          <H3 className="mb-1" variant="card">
            {title}
          </H3>
          <Text className="text-muted-foreground">{description}</Text>
        </div>
      </div>

      {submitted ? (
        <div className="rounded-lg bg-emerald-50 p-4 text-center dark:bg-emerald-950/20">
          <Text className="font-medium text-emerald-700 dark:text-emerald-400">
            Your download has started. Check your downloads folder.
          </Text>
        </div>
      ) : (
        <form className="flex gap-3" onSubmit={handleSubmit}>
          <Input
            className="flex-1"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            type="email"
            value={email}
          />
          <Button disabled={loading} type="submit">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download {fileIcons[fileType]}
          </Button>
        </form>
      )}
    </div>
  );
}
