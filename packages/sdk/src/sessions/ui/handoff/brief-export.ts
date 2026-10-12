import type { HandoffFile } from "../../protocol";
import { createZipArchive, type ZipEntry } from "./zip-archive";

const BRIEF_FILE_NAME = "brief.md";
const UNSAFE_FILE_CHARACTERS = /[^a-z0-9]+/g;
const EDGE_DASHES = /^-|-$/g;

async function downloadFile(file: HandoffFile): Promise<ZipEntry> {
  const response = await fetch(file.url);
  if (!response.ok) {
    throw new Error(
      `${file.name} could not be downloaded (${response.status}).`
    );
  }
  return {
    data: new Uint8Array(await response.arrayBuffer()),
    name: file.name,
  };
}

export function zipFileName(sessionTitle: string): string {
  const slug = sessionTitle
    .toLowerCase()
    .replace(UNSAFE_FILE_CHARACTERS, "-")
    .replace(EDGE_DASHES, "");
  return `reflet-session-${slug || "brief"}.zip`;
}

/** File URLs are short-lived, so they are fetched right when the export is asked for. */
export async function buildBriefZip(options: {
  brief: string;
  files: HandoffFile[];
}): Promise<Blob> {
  const evidence = await Promise.all(options.files.map(downloadFile));
  return await createZipArchive([
    { data: new TextEncoder().encode(options.brief), name: BRIEF_FILE_NAME },
    ...evidence,
  ]);
}

export function saveBlob(options: { blob: Blob; fileName: string }) {
  const url = URL.createObjectURL(options.blob);
  const link = document.createElement("a");
  link.download = options.fileName;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
