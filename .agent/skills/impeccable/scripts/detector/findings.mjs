import { getAntipattern } from "./registry/antipatterns.mjs";

function getAP(id) {
  return getAntipattern(id);
}

function finding(id, filePath, snippet, line = 0) {
  const ap = getAP(id);
  const base = {
    antipattern: id,
    category: ap.category || null,
    description: ap.description,
    file: filePath,
    line,
    name: ap.name,
    severity: ap.severity || "warning",
    snippet,
  };
  // Advisory findings are detected but reported separately and never counted as
  // failures. Carry the flag on the finding so every consumer (CLI, JSON, hook)
  // can partition without a registry lookup. Only stamped when true to keep the
  // finding shape stable for the vast majority of rules.
  if (ap.advisory === true) {
    base.advisory = true;
  }
  return base;
}

export { finding, getAP };
