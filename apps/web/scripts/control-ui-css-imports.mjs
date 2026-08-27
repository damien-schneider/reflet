import { readFileSync, writeFileSync } from "node:fs";

// shadcn writes control-ui's @import paths assuming components/ sits beside app/; here it lives under src/.
const entry = "app/globals.css";
const seenImports = new Set();

function keep(line) {
  if (!line.startsWith("@import")) {
    return true;
  }
  if (seenImports.has(line)) {
    return false;
  }
  seenImports.add(line);
  return true;
}

const normalized = readFileSync(entry, "utf8")
  .replaceAll("../components/control-ui/", "../src/components/control-ui/")
  .split("\n")
  .filter(keep)
  .join("\n");

writeFileSync(entry, normalized);
