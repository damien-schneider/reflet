# Changelog

All notable changes to `reflet-sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
