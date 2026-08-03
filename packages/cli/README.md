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

## License

MIT
