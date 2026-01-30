# Changelog

All notable changes to `reflet-sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
