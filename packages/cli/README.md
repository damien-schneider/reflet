# reflet-cli

Adds the [Reflet](https://reflet.app) feedback widget to a React app in one command.

```bash
npx reflet-cli init
```

The widget is a floating button. When a user opens it, the panel screenshots the
current viewport, lets them draw on that screenshot, and lets them point at an
element so the report carries the React component behind it — along with the
URL, the browser, the viewport and the console errors the page logged.

## Commands

### `reflet init`

Installs `reflet-sdk`, mounts `<RefletFeedback />` in your app entry file and
writes the public key to the env file your framework reads.

| Option | Description |
| --- | --- |
| `--public-key <key>` | Your `fb_pub_…` key. Prompted for when omitted on a TTY. |
| `--position <corner>` | `bottom-right` (default), `bottom-left`, `top-right`, `top-left`. |
| `--dry-run` | Print what would change, write nothing. |
| `--skip-install` | Do not run the package manager. |
| `--yes` | Never prompt. Use this in scripts and agent runs. |
| `--cwd <dir>` | Project root. Defaults to the current directory. |

Detected setups:

| Framework | Entry file | Env file |
| --- | --- | --- |
| Next.js App Router | `app/layout.tsx` or `src/app/layout.tsx` | `.env.local` |
| Next.js Pages Router | `pages/_app.tsx` or `src/pages/_app.tsx` | `.env.local` |
| React Router | `app/root.tsx` | `.env` |
| Vite + React | `src/main.tsx` | `.env` |

Running it twice changes nothing. If the entry file has no obvious place to
mount the widget, the CLI leaves the file alone and prints the snippet to paste.

### `reflet doctor`

Checks an existing setup: the SDK is installed, the widget is mounted, the key
is set. Exits non-zero when something is missing.

### `reflet prompt`

Prints a setup prompt for a coding agent (Claude Code, Cursor, …), for when you
would rather have the agent do the wiring.

```bash
npx reflet-cli prompt | pbcopy
```

### `reflet agent install`

Writes the Reflet workflows where coding agents look for them, so any of them
can run them without being told how:

| File | Read by |
| --- | --- |
| `.agents/skills/reflet/SKILL.md` | Codex (`$reflet`), omp, and anything else following the agent-skills layout |
| `.claude/skills/reflet/SKILL.md` | Claude Code |
| `.claude/commands/reflet.md` | Claude Code, as the `/reflet` slash command |
| `.agents/skills/reflet-live/SKILL.md` | Codex (`$reflet-live`), omp, and the rest of the agent-skills layout |
| `.claude/skills/reflet-live/SKILL.md` | Claude Code |
| `.claude/commands/reflet-live.md` | Claude Code, as the `/reflet-live` slash command |

It also adds `.reflet/` to `.gitignore`, where downloaded screenshots land.
Running it twice changes nothing. `--dry-run` and `--cwd <dir>` behave as in
`init`. `reflet prompt agent` and `reflet prompt live` print the same
workflows to stdout.

`reflet` claims one item, reads its screenshots, element source locations and
console errors, fixes it, opens the pull request, comments and moves the
status — then repeats until the queue is empty. Pass a feedback id (`/reflet
fb_…`) to work just that one.

`reflet-live` follows the session you are recording in your app's devtools:
you talk through what is wrong, the agent changes the code while you keep
recording, and it summarises what it did when you end the session. Pass the
dev server (`/reflet-live http://localhost:5173`) when it is not on port 3000.

### `reflet session watch`

Waits for what you say in the devtools session you are recording, then prints
each new passage with the elements you clicked or pointed at, their selector
and source location, and the screenshots around it, saved under
`.reflet/sessions/<session>/`. It returns once you pause, when the session
ends, or after `--timeout` seconds (default 90) with nothing new, and never
prints the same passage twice. `reflet-live` runs it in a loop. When the
session was started with "Several people are talking", each passage says who
spoke (`[00:10] Speaker 1: … Speaker 2: …`), and `reflet-live` tells the agent
not to take one speaker's remark as another's change of mind.

```bash
npx reflet-cli session watch --url http://localhost:3000
```

It reads through the app's dev server, so it needs the `reflet-sdk` devtools
route and Connect done from the devtools panel footer: only your own sessions,
and only in development. A session already ended when it first looks is left
alone. Delete `.reflet/sessions/watch.json` to read the current session from
the start again.

### Admin API

`REFLET_API_KEY`, or `reflet login --api-key fb_sec_…` once. Every command
prints JSON when piped or given `--json`.

```bash
npx reflet-cli feedback claim-next --json
npx reflet-cli feedback get <id> --json
npx reflet-cli screenshot download <id>      # → .reflet/screenshots/<id>/
npx reflet-cli feedback status <id> completed
```

`npx reflet-cli` lists the resources, `npx reflet-cli <resource>` its actions.

## License

MIT
