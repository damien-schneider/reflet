# Changelog

All notable changes to `reflet-sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
