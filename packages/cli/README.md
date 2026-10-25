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

`--global` writes only the `reflet-live` workflow, once for every repository:
`~/.agents/skills/reflet-live/SKILL.md`, `~/.claude/skills/reflet-live/SKILL.md`
and `~/.claude/commands/reflet-live.md`. It leaves `.gitignore` alone; the
feedback workflow stays per repository.

`reflet` claims one item, reads its screenshots, element source locations and
console errors, fixes it, opens the pull request, comments and moves the
status — then repeats until the queue is empty. Pass a feedback id (`/reflet
fb_…`) to work just that one.

`reflet-live` follows what you say while Reflet Live records you: you talk
through what is wrong while moving between your apps, the agent changes the
code of the app each passage is about while you keep recording, and it
summarises what it did when you stop. Start the agent over the folder that
holds your repositories (`claude --add-dir ~/Documents/GitHub`) so it can edit
each of them.

### `reflet live`

Starts Reflet Live on this machine and opens its window (Chrome or Edge as an
app window, else your default browser). Press Record there once: the
recording lives in that window, so reloads, restarts and crashes of your apps
never touch it. Every app in development with the `reflet-sdk` devtools route
joins on its own when its panel loads, and its devtools bar gains Live
controls (Point at, Pause, Stop).

```bash
npx reflet-cli live            # Reflet Live · http://localhost:47417
```

The terminal prints each app that joins and each Record, Pause and Stop.
Ctrl+C stops the recording, waits up to 15 seconds for the window to finish
uploading, then exits; a second Ctrl+C exits at once. Running it again while
it runs reopens the window. `--port <n>` picks another port when 47417 is
taken; `--no-open` skips opening the window. Transcription runs in Reflet's
cloud, billed to the organization you pick in the window. Live recordings never
show in the Sessions tab and are erased 24 hours after their last update.

### `reflet live watch`

Waits for what you say while Reflet Live records, then prints each new passage
under the app it is about (`in one-rec/apps/electron · Export (/export)`, or
`outside your apps (last: …)` while you were in your editor or terminal), with
what you clicked or pointed at, its selector and source location, and the
screenshots around it, saved under `.reflet/live/<session>/`. An `Apps` legend
maps each app to its folder. It returns once you pause, when the recording
ends, or after `--timeout` seconds (default 90) with nothing new, and never
prints the same passage twice. `--json` gives each entry its `place`.
`reflet-live` runs it in a loop.

```bash
npx reflet-cli live watch
```

When Reflet Live is not running it keeps waiting until the timeout, then says
so. A recording already ended when it first looks is left alone. Delete
`.reflet/live/watch.json` to read the current recording from the start again.

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
