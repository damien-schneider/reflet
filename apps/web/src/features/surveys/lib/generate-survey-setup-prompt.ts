import { DEFAULT_TIME_DELAY_MS } from "@reflet/survey-core";
import {
  type InstallTarget,
  reactSdkSnippet,
  scriptTagSnippet,
  scriptTriggerSnippet,
  sdkTriggerSnippet,
  type TriggerCall,
  triggerCallOf,
  WIDGET_INSTANCE_GLOBAL,
} from "@/features/surveys/lib/survey-install-snippets";

const MS_PER_SECOND = 1000;

export interface SetupPromptSurvey extends InstallTarget {
  title: string;
}

const pagesClause = (survey: InstallTarget): string => {
  const pageUrl = survey.triggerConfig?.pageUrl?.trim();
  return pageUrl
    ? `on pages matching \`${pageUrl}\` (comma-separated, \`*\` is a wildcard, patterns starting with \`/\` match the path)`
    : "on any page";
};

const automaticTriggerSentence = (survey: InstallTarget): string => {
  const pages = pagesClause(survey);
  switch (survey.triggerType) {
    case "page_visit":
      return `It shows automatically when a visitor opens a page, ${pages}.`;
    case "time_delay": {
      const delayMs = survey.triggerConfig?.delayMs ?? DEFAULT_TIME_DELAY_MS;
      return `It shows automatically after the visitor spends ${delayMs / MS_PER_SECOND} seconds ${pages}.`;
    }
    case "exit_intent":
      return `It shows automatically when the visitor moves the pointer out through the top of the window (desktop), ${pages}.`;
    case "feedback_submitted":
      return `It shows automatically right after the visitor submits feedback through Reflet’s feedback button or widget, ${pages}.`;
    default:
      return "";
  }
};

const codeTriggerSection = (
  survey: SetupPromptSurvey,
  call: TriggerCall
): string => {
  const moment =
    call.method === "track"
      ? `Find the place in my code where this event really happens (for example right after a successful checkout or after the user finishes onboarding) and track it there. Ask me if the right moment is unclear. The survey only shows ${pagesClause(survey)}.`
      : "This survey never shows on its own. Find the moment in my app where asking these questions makes sense (ask me if unclear) and show it there.";
  return `### Step 3: Show the survey from code

${moment}

With the script tag (any website):

\`\`\`js
${scriptTriggerSnippet(call)}
\`\`\`

With the React SDK (inside \`RefletProvider\`):

\`\`\`tsx
${sdkTriggerSnippet(call)}
\`\`\`

Calls made before surveys finish loading are queued and replayed. With the script tag, \`${WIDGET_INSTANCE_GLOBAL}\` only exists once the script has run, so call it after page load. Each visitor only sees the survey when its display rules allow it, so calling it more than once is safe.`;
};

const automaticSection = (
  survey: InstallTarget
): string => `### Step 3: Nothing else to wire

${automaticTriggerSentence(survey)} Installing Reflet is enough; no extra code is needed for this survey.`;

/** Instructions a coding agent can follow to install Reflet surveys and wire this survey’s trigger. */
export function generateSurveySetupPrompt({
  publicKey,
  survey,
}: {
  publicKey: string;
  survey: SetupPromptSurvey;
}): string {
  const call = triggerCallOf(survey);
  return `# Reflet In-App Survey Setup Request

I want to show the Reflet survey “${survey.title}” inside my application. Reflet renders the survey, applies its targeting and display frequency, and stores the answers.

## Details

\`\`\`
PUBLIC_KEY=${publicKey}
SURVEY_ID=${survey._id}
\`\`\`

## Your Task

### Step 1: Analyze my codebase

1. **Framework**: React / Next.js, or something else (Vue, Svelte, server-rendered HTML, vanilla JS)?
2. **Package manager**: check for \`bun.lock\`, \`pnpm-lock.yaml\`, \`yarn.lock\` or \`package-lock.json\`.
3. **Auth**: if users sign in, find where the current user is available so surveys can respect “show once” across devices.
4. **Existing Reflet setup**: if \`reflet-sdk\` or the Reflet widget script is already installed, reuse it instead of installing twice.

### Step 2: Install Reflet surveys (pick one)

#### Option A: React SDK (React, Next.js)

Install \`reflet-sdk\` with my package manager, then mount \`<RefletSurveys />\` once, near the root of the app:

\`\`\`tsx
${reactSdkSnippet(publicKey)}
\`\`\`

To identify signed-in users, pass \`user={{ id: user.id, email: user.email, name: user.name }}\` to \`RefletProvider\`.

#### Option B: Script tag (any website)

Add this before \`</body>\` on every page where surveys may appear:

\`\`\`html
${scriptTagSnippet(publicKey)}
\`\`\`

To identify signed-in users, set \`window.Reflet = { publicKey: "${publicKey}", user: { id, email, name } }\` before the script loads (then the \`data-public-key\` attribute is optional). The widget instance is available as \`${WIDGET_INSTANCE_GLOBAL}\`.

${call ? codeTriggerSection(survey, call) : automaticSection(survey)}

## Requirements

1. Install Reflet once; don’t render \`<RefletSurveys />\` or the script tag in several places.
2. Don’t add your own survey UI; Reflet renders it, follows the system theme and uses my brand color.
3. Keep the public key in an environment variable if the project already does that for other public keys.

## After Implementation

Tell me:
1. **Files changed**: every file you created or edited.
2. **How to test**: the survey must be **Active** in the Reflet dashboard. Explain how to trigger it locally. Reflet remembers who already answered, so test in a private window to see it again.`;
}
