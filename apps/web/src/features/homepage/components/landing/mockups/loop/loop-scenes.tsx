import type { ReactNode } from "react";

import { SceneAsk, SceneReply } from "./scene-app";
import { SceneBoard, SceneTriage } from "./scene-board";
import { SceneBuild, SceneRelease, SceneRoadmap } from "./scene-ship";

export interface LoopScene {
  caption: string;
  chrome: string;
  id: string;
  Scene: () => ReactNode;
  step: string;
}

export const LOOP_SCENES: readonly LoopScene[] = [
  {
    caption:
      "Inside your product, on the element they are pointing at. No forum, no account to create.",
    chrome: "app.acme.com",
    id: "ask",
    Scene: SceneAsk,
    step: "They ask",
  },
  {
    caption:
      "It lands on the public board the second they hit send. Nothing sits in an inbox.",
    chrome: "acme.reflet.app/board",
    id: "board",
    Scene: SceneBoard,
    step: "It lands",
  },
  {
    caption:
      "Reflet reads it, tags it, and folds every duplicate into the same thread.",
    chrome: "acme.reflet.app/board",
    id: "triage",
    Scene: SceneTriage,
    step: "Reflet reads it",
  },
  {
    caption:
      "Votes decide the order, in the open. Everyone can see where their request stands.",
    chrome: "acme.reflet.app/roadmap",
    id: "roadmap",
    Scene: SceneRoadmap,
    step: "It earns a slot",
  },
  {
    caption:
      "Your agent picks it up over MCP, with the whole thread as context.",
    chrome: "~/acme — zsh",
    id: "build",
    Scene: SceneBuild,
    step: "You build it",
  },
  {
    caption: "The thread becomes the changelog entry — version, note and all.",
    chrome: "acme.com/changelog",
    id: "release",
    Scene: SceneRelease,
    step: "It ships",
  },
  {
    caption:
      "Everyone who asked or voted hears back the day it ships. Back where they started.",
    chrome: "app.acme.com",
    id: "reply",
    Scene: SceneReply,
    step: "They hear back",
  },
];
