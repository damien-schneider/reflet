"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { toast } from "@ctrl-ui/react/ui/toast";
import { DownloadSimple } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useConvex } from "convex/react";
import { format } from "date-fns";
import { useState } from "react";
import { responsesToCsv } from "@/features/surveys/lib/responses-csv";

const NON_FILENAME_CHARACTERS = /[^a-z0-9]+/g;
const EDGE_DASHES = /^-+|-+$/g;
const UTF8_BYTE_ORDER_MARK = "\uFEFF";

interface ExportResponsesButtonProps {
  endingTitles: ReadonlyMap<string, string>;
  surveyId: Id<"surveys">;
  surveyTitle: string;
}

const downloadCsv = (csv: string, fileName: string) => {
  const blob = new Blob([UTF8_BYTE_ORDER_MARK, csv], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

export function ExportResponsesButton({
  endingTitles,
  surveyId,
  surveyTitle,
}: ExportResponsesButtonProps) {
  const convex = useConvex();
  const [isExporting, setIsExporting] = useState(false);

  const exportResponses = async () => {
    setIsExporting(true);
    try {
      const exportResult = await convex.query(
        api.surveys.queries.exportResponses,
        { surveyId }
      );
      const titleSlug =
        surveyTitle
          .toLowerCase()
          .replace(NON_FILENAME_CHARACTERS, "-")
          .replace(EDGE_DASHES, "") || "survey";
      downloadCsv(
        responsesToCsv(exportResult, endingTitles),
        `${titleSlug}-responses-${format(Date.now(), "yyyy-MM-dd")}.csv`
      );
      if (exportResult.truncated) {
        toast.warning("Export includes the most recent responses only", {
          description: `${exportResult.rows.length} responses fit in one file. Older responses aren’t included.`,
        });
      }
    } catch {
      toast.error("Couldn’t export responses. Try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      disabled={isExporting}
      onClick={exportResponses}
      size="sm"
      variant="surface"
    >
      <DownloadSimple aria-hidden className="size-4" />
      {isExporting ? "Exporting…" : "Export CSV"}
    </Button>
  );
}
