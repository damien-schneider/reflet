import { createRoot } from "react-dom/client";
import { followColorScheme } from "./color-scheme";
import { LiveWindow } from "./live-window";

const container = document.getElementById("root");
if (!container) {
  throw new Error("The Reflet Live page has no #root element.");
}

followColorScheme(document);
createRoot(container).render(<LiveWindow />);
