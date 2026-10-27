# reflet-cli

Install Reflet's feedback widget, manage an organization and hand recording context to a coding agent.

Requires Node.js 18 or later. Run without installing globally:

```sh
npx reflet-cli@latest --help
```

For the `reflet` executable, install with `npm install -g reflet-cli`.

## Set up a widget

Run at the React app root with a public `fb_pub_` key from your organization settings:

```sh
npx reflet-cli init --public-key fb_pub_your_key --dry-run
npx reflet-cli init --public-key fb_pub_your_key --yes
npx reflet-cli doctor
```

`init` can install `reflet-sdk`, edit the detected entry file and write a public-key environment variable. Review the changes. `doctor` checks local files, not the live service. See [widget setup](https://www.reflet.app/docs/cli#widget) for supported entry points and setup flags.

## Manage feedback

An organization owner or administrator creates a secret `fb_sec_` key in Settings → Agents & CLI. Keep it out of browser code and git.

```sh
npx reflet-cli login
npx reflet-cli feedback next --json
npx reflet-cli feedback claim-next --as my-agent --json
```

Login validates the key and saves `~/.reflet/config.json` with mode `0600`. The interactive prompt is not masked. In automation, supply `REFLET_API_KEY` through a secret store instead. `REFLET_API_URL` overrides the backend origin for self-hosting, without `/api/v1`.

Commands can mutate feedback, create GitHub issues, invite members and publish releases. `claim-next` is a write and moves an item to `in_progress`. JSON is automatic when piped; use `--json` interactively to retain pagination fields. `feedback comment` and `feedback vote` are registered but currently lack the signed-user token their API routes require and return `401`.

## Install agent instructions

```sh
npx reflet-cli agent install --dry-run
npx reflet-cli agent install
npx reflet-cli agent install --global
```

Repository installation writes feedback/live skills and Claude slash commands, replacing differing files, and adds `.reflet/` to an existing `.gitignore`. Global installation writes only the live workflow in your home directory. These commands install instructions; they do not start an autonomous worker.

## Follow a recording

```sh
# Keep this running, connect an app through its devtools, then press Record.
npx reflet-cli live

# In another terminal or from your coding agent:
npx reflet-cli live watch --json
```

The local hub hands passages and cited screenshots to the agent. Recording/transcription uses the connected organization's backend, not local-only storage. `watch` writes a cursor and screenshots under `.reflet/live/`; keep this directory out of git. Ctrl+C requests a recording stop and waits briefly for uploads.

## Reference

The [CLI guide](https://www.reflet.app/docs/cli) is the canonical command-family, workflow, privacy and troubleshooting reference. See the [HTTP API](https://www.reflet.app/docs/api) for endpoints, authentication, pagination and limits.

Use `reflet --help`, `reflet live --help` or `reflet <resource> <action> --help` for flags. API failures print to stderr and exit nonzero; the CLI does not retry them automatically.

## License

MIT
