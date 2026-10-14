# Changelog

All notable changes to `reflet-sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.4] - 2026-10-15

### Changed

- Devtools: one panel button replaces the separate Board and Notes buttons. It reopens the panel on the tab you used last, even after a reload, and shows how many notes aren't on the board yet. The microphone opens Sessions directly. The bar steps aside while the panel is open, and the panel opens wider (480 px).
- Devtools: the panel's tabs carry icons, in the order Board, Notes, Sessions, Code. Your Reflet account (avatar, name, organization) sits in the panel's footer, with Connect and Disconnect; the Board tab no longer has a connection bar, and Sessions no longer says "Recording as…".
- Devtools: secondary choices are menus, not a second row of tabs: This page / Whole board on the Board, On screen / Details on a session's intentions. Every menu and surface follows one radius scale.
- Devtools: opening a session replaces the tabs with a back button to Sessions; the brief adds one more level back to the session. The links back inside the content, except "All evidence" from one screenshot, are gone. Moving between levels puts keyboard focus on the new view's heading, or on the view itself while it loads, and the session keeps its tab and On screen / Details choice when you come back from the brief.
- Sessions: on first use, "What a session records" shows above Start session instead of below it. Deleting an intention or a screenshot now says exactly which saved briefs go with it.
- Devtools: when connecting isn't possible, the panel says what it needs: a public key and a local address (localhost, *.localhost or *.test), or REFLET_SECRET_KEY. Error messages point to the panel's footer instead of the old Board tab.
- Sessions: "Hand off N confirmed" is now "Prepare brief". Nothing is shared until you copy the brief or download its `.zip`; "Copied or exported briefs can't be recalled" is gone. Earlier briefs list the intention they carried, when, and whether you copied or downloaded them. Dates read "Today, 14:02", "Yesterday, 14:02" or "12 Oct, 14:02".
- Notes: "Send to board" is now "Add to board". The empty Notes tab has a Pick an element button.

### Added

- Sessions: add an intention to the board from its card, or every confirmed intention not on the board yet from the review's footer. Intentions on the board show "On the board".
- Devtools: the account footer shows your Reflet avatar. Requires the matching Reflet backend; older backends show initials.

### Removed

- Devtools: the pick button in the panel header (the bar and the Notes tab have it), and the press-shrink on rows and cards.

## [0.7.3] - 2026-10-14

### Added

- Sessions: the Intentions tab opens On screen. Each intention is pinned on the screenshot of the moment it's about: a frame around the element, a line, a number, and a short label the AI writes (at most 6 words, in your language), with Confirm and Dismiss right on the label. A choice already made stays focusable but inactive, like on the cards; Undo in the notice reverts it. Click the label to open the full intention under Details. Intentions with no screenshot are listed below with the same buttons. Your own wording replaces the AI label: once you, an accepted change or a removed contribution rewrites the need, the label shows the need itself. Requires the matching Reflet backend.
- Sessions: the frame goes around the element you talk about, not the one under your pointer. Each screenshot now records the names and positions of the buttons, links, headings and images it shows (masked elements and anything in or around typed text left out, at most 80), and the AI picks among them. When nothing matches, or for sessions analyzed before, the label sits on the screenshot without a frame. Removing a screenshot or correcting a passage's context moves the pin at once. The session disclosure lists this.

## [0.7.2] - 2026-10-13

### Fixed

- Team tools: Sign in with Reflet failed on every app that sends `Cross-Origin-Opener-Policy: same-origin` (a common security header, Helmet's default), reporting "Sign-in was cancelled." a second after the popup opened. With `same-origin-allow-popups` it still failed in Safari. Sign-in now moves the tab to reflet.app and back to the same page instead of using a popup, so it works whatever that header says, and pop-up blockers no longer get in the way.

## [0.7.1] - 2026-10-13

### Fixed

- Sessions: a failed comparison of a continued intention showed its error and a "Try again" button twice, and a session ended but not yet analyzed claimed "Comparing with revision N…" next to "Not analyzed yet". The review's status line now reports the comparison once (comparing, failed with its reason, or not analyzed yet), and the What changes card only shows what the comparison found.
- Sessions: a screenshot still rendering when you finish or pause is now reported as "Recording stopped before the screenshot was taken" right away. Before, its record waited for the render to finish, up to 20 seconds on slow pages such as Safari, so a moment marked just before Finish was missing from the review.
- Sessions: anything that finishes uploading after the analysis, a screenshot or the record of one that was missed, now appears in the review on its own. Before, the review stopped refreshing once the analysis was done and showed it only after a reload.

## [0.7.0] - 2026-10-13

### Added

- Sessions: Show context opens a passage's moment: what was said, the screenshot with the element and pointer outlined when they match that instant (marked approximate when they don't), the clicks, hovers, marks and page changes around it, and the intentions that cite it. Previous and Next moment work from the keyboard; Escape closes it.
- Sessions: change what a passage is about. Pick another nearby event or screenshot, mark the context unknown, or go back to automatic. Your choice survives a new analysis and is what the analysis and the brief use. If someone changed it first, you're asked to reload instead of overwriting them.
- Sessions: Continue this intention. It recalls the need, the considered response and the open questions, then starts a new session only when you click Start session. When it ends, the AI compares what you said with the revision you started from and lists what changes: precisions, contradictions, new constraints, different solutions and observed results, each with its quotes and screenshots, hypotheses labelled as such. Accept, edit then accept, reject or undo each change, answer the AI's question, or remove the whole contribution. The intention only changes when you accept, and each acceptance makes a new revision.
- Sessions: after a change ships, the continuing session's AI reading says whether it looks resolved, still needs work or lacks evidence. You confirm the check; nothing is marked done on its own.
- Sessions: an intention shows which later sessions continued it or were added to it, and what each one changed. Screenshots they contributed can go into the brief.
- Sessions: when a new intention looks like one you already have, the AI says why. Add it to that intention, keep it separate, or undo.
- Sessions: Hand off shows what changed since the last brief of each intention (revision 1 → 2, field by field), and Previous briefs name the intention and revision they carried.
- Sessions: delete an intention, along with what later sessions added to it.

### Changed

- Sessions: the review talks about intentions. The Proposals tab is now Intentions, Keep is now Confirm, and the hand-off button reads "Hand off N confirmed". Confirming an intention doesn't approve its considered response, which you edit on its own. Each card says whether the AI or you wrote it.

## [0.6.9] - 2026-10-13

### Changed

- Sessions: hovers record how long the pointer actually stayed on an element (700 ms minimum) instead of a fixed 700 ms. A hover still in progress when you pause or finish is kept with its duration so far.
- Sessions: a click made from the keyboard is recorded without a pointer position instead of a fake one at the top-left corner.

### Fixed

- Sessions: a screenshot still waiting behind another one, or still rendering, when you pause or finish is no longer kept. It's recorded as missing, so nothing on screen after the pause ends up in the session.
- Sessions: removing a screenshot moves keyboard focus to its card, and cancelling the removal puts it back on the Remove button, instead of dropping it to the top of the page.
- Sessions: a hover's time, pointer, element and page position are recorded from the same instant, so they can no longer describe two different states of the page.

## [0.6.8] - 2026-10-12

### Added

- Sessions: remove a single screenshot from a session's Evidence tab, from the list or the enlarged view. The image is deleted for good and the rest of the session stays as it was. Briefs already copied or exported keep their copy.

### Fixed

- Sessions: pausing right after a page change no longer takes the pending screenshot of the new page.

## [0.6.7] - 2026-10-12

### Fixed

- The Sessions disclosure says what screenshots actually show: form fields appear empty, but other text on screen, rich-text editors included, stays visible. It no longer promises that field values are never recorded.

## [0.6.6] - 2026-10-12

### Added

- Sessions, in the devtools Sessions tab: talk through your app while you use it, and Reflet records your voice, what you point at and mark, and screenshots at the start, at each mark and on each page change. Form fields appear empty in those screenshots, and password fields, card fields and `data-reflet-redact` elements are left out. Pause stops all collection; a reload stops the recording and never turns the microphone back on. Recordings wait in IndexedDB and upload in order, so going offline or reloading loses nothing already saved.
- After a session, Reflet transcribes it (Whisper through OpenRouter, zero data retention; audio deleted once transcribed) and proposes what you asked for, each with the quotes and screenshots behind it, what you set aside and what stays unknown. Keep, put aside, dismiss, edit, clarify or merge proposals, correct the transcript, then hand the kept ones off: copy the brief for a coding agent, export it as a `.zip` with its screenshots, or create internal feedback.
- Team tools in production: members of your Reflet organization open a page with `?reflet-team`, sign in with Reflet in a popup, and record sessions on the deployed app. Tokens are bound to the origin and the widget's key, last 7 days and are revocable from the account page. The key must list the origin under Allowed domains. A page shows one set of team tools however many widgets it mounts, and none where the devtools already run. New `teamTools` (default `true`) and `appUrl` props on `RefletFeedback`.
- In-app surveys. Mount `<RefletSurveys />` inside `RefletProvider` and every survey the visitor is eligible for is armed — page visit (including client-side navigation), time on page, exit intent, custom events via `useRefletSurveys().track(name)`, and feedback sent from the SDK (the floating widget, `FeedbackDialog`, `useCreateFeedback` or `reflet.create`). One survey shows at a time, in a shadow root at the position set in the dashboard, with branching, several endings, Back, a progress bar, keyboard shortcuts (Enter, Escape, digits, Y/N) and light, dark or automatic theme.
- `useRefletSurveys()` returns `track`, `showSurvey`, `dismissSurvey` and `activeSurveyId`; calls made before surveys load are queued.
- `useSurveySession(survey)` and `<SurveyCard />` to run and render surveys in your own UI, also exported from the new `reflet-sdk/surveys` entry with `previewTransport` and `SurveySession`.
- `Reflet` client methods `getEligibleSurveys`, `startSurveyResponse`, `submitSurveyAnswer`, `completeSurveyResponse` and `dismissSurveyResponse`, and the survey types (`PublicSurvey`, `SurveyQuestion`, `AnswerValue`…).

### Fixed

- `ChangelogEntry` now matches what the API returns: linked feedback is in `items` (each with `id`, `title` and `status`), not `feedback`. The changelog widget no longer crashes on load and shows versions as published (`v1.2.3`, not `vv1.2.3`). Unset `ChangelogWidget` props fall back to the widget defaults instead of clearing them.
- In Firefox, keyboard handlers on the widget's and devtools' controls run again, so Enter saves a picker note, and keys typed in the widget no longer reach the host page's shortcuts. Firefox lets every key press the widget re-sent internally escape back out to the page.

## [0.6.5] - 2026-10-04

### Changed

- Pressing Enter on an empty devtools picker note copies the element instead of saving an empty note. With text, Enter still saves the note; the arrow button always saves.

## [0.6.4] - 2026-10-04

### Added

- Click a screenshot thumbnail in the widget to open it full size, the same view the pencil opens.

### Fixed

- Picked-element highlights and devtools close-ups land on the element on Windows and Linux. A classic scrollbar used to shift them left, by up to its own width near the right edge.
- Letter hotkeys work with macOS Option (⌥F types "ƒ") and on non-Latin keyboard layouts, for both the `hotkey` prop and the picker's ⌘C / Ctrl+C.
- Pressing Enter to confirm Japanese, Chinese or Korean input no longer submits the picker note, the devtools note or a text annotation. Pressing Escape to cancel the input no longer closes the picker note, a text annotation, the devtools panel or a note pin either.
- Right-click no longer picks an element, and the page's context menu no longer opens while picking.
- "Open in editor" links work for Windows paths (`vscode://file/C:/…`), and devtools resolves `file:///C:/…`, Vite `/@fs/C:/…` and `/C:/…` source frames.
- Devtools refuses Server Component chunks on another Windows drive as outside the repository.

## [0.6.3] - 2026-10-04

### Added

- Copy an element straight from the devtools picker, React Grab style: aim at it and press ⌘C (Ctrl+C), or press Copy on the note card to include your note. The clipboard gets the element, its source location, owner components, selector and HTML.

### Fixed

- The element picker and its hover outline stay above every layer of the page, so elements inside a fixed sidebar or header are outlined instead of hidden under it.
- The note card and hover label stay on screen when the picked element is taller than the window: the card tries below, above, then beside the element, and overlaps it only when nothing else fits.

## [0.6.2] - 2026-10-04

### Fixed

- The devtools Board tab no longer dead-ends when nothing points at the current page: switch between "This page" and "Whole board", or click "Show the whole board" from the empty state, so feedback filed on other routes or other tenants' URLs stays reachable.

## [0.6.1] - 2026-10-04

### Fixed

- Dragging the devtools bar follows the pointer directly instead of trailing behind it. The slide animation only plays when the docked bar makes room for the opening panel.

## [0.6.0] - 2026-09-30

### Security

- The devtools Vite plugin refuses requests from other machines, and the devtools route rejects requests without a same-origin `Sec-Fetch-Site` header unless they come to a plain-HTTP hostname you allowed. Next.js apps must run `next dev -H 127.0.0.1`: see the devtools setup in the README.
- "Copy as prompt" on board feedback now keeps the page URL and element details inside the untrusted `<user_report>` block, so a reporter cannot write text that looks like instructions from your team.

### Fixed

- Failed API responses are checked before their body is parsed, so an error page no longer surfaces as a JSON parse error.
- Devtools notes release screenshot preview memory when closed.

## [0.5.2] - 2026-09-29

### Added

- Connect the devtools Board tab to Reflet without configuring a secret key. Approve access in Reflet and revoke it from the Board tab or Account → Devtools. Credentials stay on the dev server, isolated by project and backend; notes remain internal and are attributed to the connected member.

### Fixed

- Using the widget no longer closes the app's open menus, popovers and pickers. Pointing at an element or attaching a screenshot keeps them open, so their content can be reported, and typing in the widget no longer loses focus to a menu's focus trap. The widget also stays clickable while a modal menu disables pointer events on the page.

## [0.5.1] - 2026-09-28

### Fixed

- Picking an element no longer submits a hidden close-up as an extra screenshot. The saved attachments now match the previews, with the selected element still highlighted.

## [0.5.0] - 2026-09-24

### Added

- Devtools for the team, development only: a draggable bar above the launcher with a movable, resizable full-height panel to pick an element and write a note on it (shown instantly as a numbered pin, stored in IndexedDB) or Shift+click it to open its source, copy notes as an agent prompt, send them to the board as internal feedback, and read the board's feedback for the current page
- `reflet-sdk/devtools/next` and `reflet-sdk/devtools/vite`: the dev-only route behind code view and the board; it reads files inside the repository and keeps `REFLET_SECRET_KEY` on the server
- "Clear notes" in the devtools archives every note at once; cleared notes can be restored for a day, then are deleted for good
- `devtools` prop on `RefletFeedback` to turn the bar off
- Internal feedback: `POST /api/v1/feedback/create` accepts `internal: true` with a secret key, and `GET /api/v1/feedback/list` accepts `pagePath` to list what was reported on one route

### Fixed

- Screenshots no longer wait out the widget's own animations before capturing
- A moved widget that had to squeeze into a smaller window goes back to where it was put once the window grows again

## [0.4.3] - 2026-09-22

### Fixed

- Host shortcuts that listen in the capture phase no longer see keys typed in the widget either — the widget stops them before the host and replays them inside its own shadow root
- Only a host capture listener registered before `reflet-sdk/feedback` is imported still runs first

## [0.4.2] - 2026-09-22

### Fixed

- Keys typed in the widget no longer trigger the host page's keyboard shortcuts — Space in the message types a space instead of playing or pausing the host's video
- Host shortcuts listening in the capture phase still run first; they should read `event.composedPath()[0]` rather than `event.target` to recognise the widget's text fields

## [0.4.1] - 2026-09-20

### Added

- Point at several elements in one report — each pick gets its own screenshot, its own comment and its own outline
- The comment written while picking is editable in that screenshot's editor
- Sending anonymously asks for an email first, as a dialog on desktop and a drawer on phones

### Changed

- Element picks ship as `context.selections[]`; the single `context.selection` field is gone
- Move and close moved inside the message field, next to the options and send buttons
- Screenshot cards drop the Retake button — remove the capture and take a new one
- The message field stays expanded instead of growing on focus

### Fixed

- Moving the panel no longer moves the collapsed launcher away from its corner
- Hovering the move handle without pressing it no longer drags the panel
- A picked element no longer counts as a drawing in the screenshot badge

## [0.3.5] - 2026-09-17

### Changed

- Screenshot capture runs on `@zumer/snapdom` 3; apps that also install snapdom directly need `^3.0.0`
- Base UI, React and the rest of the toolchain move to their latest releases

## [0.3.4] - 2026-09-13

### Changed

- Compact, draggable feedback controls with improved desktop and mobile interactions
- Screenshots can be added, annotated, and removed independently while composing feedback
- Smoother annotation editing with text annotations and an accessible color picker

### Fixed

- Retrying screenshot uploads no longer creates duplicate attachments
- Screenshot captures stay attached to the draft that requested them when the widget closes or reopens

## [0.3.3] - 2026-08-23

### Added

- Small "i" icon next to "Powered by Reflet" — hover it to see the SDK version
- Capture watchdog: if the screenshot pipeline hangs, the capture retries without raster images so the report always lands

### Fixed

- Screenshots no longer hang forever on pages whose cross-origin images fail snapdom's image decode (Chrome 151 + Convex storage avatars reproduced it) — the capture falls back to an image-free screenshot within ~10 seconds
- The capture waits for page animations to settle first, so tiles frozen mid-entrance or mid-drag animation no longer appear displaced

## [0.3.2] - 2026-08-23

### Fixed

- The screenshot now retakes itself (debounced) when the reporter resizes the window while composing, so it can no longer show a layout for a viewport they are no longer on — the reported context (viewport size, scroll) stays in sync with the pixels
- The widget's temporary history patches are now fully removed on close: `history.pushState`/`replaceState` are restored to their exact previous state instead of a bound copy

## [0.3.1] - 2026-08-23

### Added

- Visible text of the picked element ships with the selection, so agents can match it against the codebase even when the markup is truncated
- Scroll position reported with the page context, telling agents where in the page the screenshot sits
- Zoomed element shot now shows the surrounding zone: everything outside the selection is dimmed and the selection framed with an outline

### Changed

- The page context (url, title, scroll) is frozen at the same instant as each screenshot, and re-captured when the app navigates client-side while the panel is open — a report can no longer mix one route's pixels with another route's url
- Picking an element re-captures the viewport first, so the highlight rectangle always lands on the scroll position the element had
- Page screenshots run with snapdom `reconcile`, pinning layout drift between the live DOM and the capture

### Fixed

- Reported urls mask credential-shaped query values (`?token=…`, `?userEmail=…`) before they leave the browser

## [0.3.0] - 2026-08-08

### Added

- Element close-up screenshot captured when the reporter picks an element, uploaded alongside the page screenshot
- `region` on the element selection — the landmark and heading the element sits under (`dialog "Members" › Danger zone`)
- `data-reflet-redact` attribute to drop a subtree from the markup the widget reports

### Changed

- Redesigned the floating widget: smaller launcher, layered shadows, softer motion, and a launcher that keeps its size when the panel opens
- Element selectors stop at the shortest unique path and anchor on stable handles (`id`, `data-testid`, `name`, `aria-label`) instead of always walking up to `body`
- Reported markup is redacted in the browser: field values, emails, tokens and URL query strings never leave the page

### Fixed

- Minified component names are no longer reported as the owning React component

## [0.2.0] - 2026-08-03

### Added

- **Feedback Widget** (`reflet-sdk/feedback`)
  - `RefletFeedback` floating widget rendered in a shadow root
  - Screenshot capture with an annotation editor (pen, arrow, rectangle, highlight, blur)
  - Element picker reporting the selector, markup and React component stack
  - Console recording, page context and configurable hotkey

## [0.1.0] - 2025-01-30

### Added

- Initial release of the Reflet SDK
- **Core Client** (`reflet-sdk`)
  - `Reflet` class for direct API interaction
  - Full TypeScript support with comprehensive types
  - Methods: `list`, `get`, `create`, `vote`, `comment`, `subscribe`, `unsubscribe`
  - Board configuration and roadmap/changelog fetching
  - Custom error classes: `RefletError`, `RefletAuthError`, `RefletNotFoundError`, `RefletValidationError`

- **React Bindings** (`reflet-sdk/react`)
  - `RefletProvider` for app-wide configuration
  - Query hooks: `useFeedbackList`, `useFeedback`, `useComments`, `useBoardConfig`, `useRoadmap`, `useChangelog`
  - Mutation hooks: `useCreateFeedback`, `useVote`, `useAddComment`, `useSubscription`
  - Built-in loading, error, and refetch states

- **Server Utilities** (`reflet-sdk/server`)
  - `signUser` function for secure JWT token generation
  - `verifyUser` function for token validation
  - Server-side user signing for production security
