import { createRoot } from "react-dom/client";
import { ShadowPortal } from "../../feedback/ui/shadow-portal";
import { LiveWindow } from "./live-window";

const container = document.getElementById("root");
if (!container) {
  throw new Error("The Reflet Live page has no #root element.");
}

createRoot(container).render(
  <ShadowPortal offset={0} theme="auto">
    <LiveWindow />
  </ShadowPortal>
);
