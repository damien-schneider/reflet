import { describePlace } from "../protocol";
import type { HubActivity } from "./hub-link/use-hub-stream";

export function LiveActivity({ activity }: { activity: HubActivity }) {
  const { agentFollowing, apps, entries, focusedAppId } = activity;
  return (
    <>
      <section aria-labelledby="lw-apps" className="lw-section">
        <h2 className="lw-heading" id="lw-apps">
          Apps
        </h2>
        {apps.length === 0 ? (
          <p className="dt-meta">
            Open one of your apps with the Reflet devtools: it joins on its own.
          </p>
        ) : (
          <ul className="lw-list">
            {apps.map((app) => (
              <li
                className="lw-app"
                data-focused={app.id === focusedAppId}
                key={app.id}
                title={app.root}
              >
                <span aria-hidden="true" className="lw-dot" />
                <span>{app.label}</span>
                <span className="dt-meta">{app.origin}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="lw-agent" data-following={agentFollowing}>
        {agentFollowing
          ? "Agent: following"
          : "No agent following: run /reflet-live in your coding agent"}
      </p>
      {entries.length > 0 && (
        <section aria-labelledby="lw-passages" className="lw-section">
          <h2 className="lw-heading" id="lw-passages">
            Last passages
          </h2>
          <ol className="lw-list">
            {entries.map((entry) => (
              <li className="lw-passage" key={entry.id}>
                <span className="dt-meta">{describePlace(entry.place)}</span>
                <span className="lw-passage-text">
                  {entry.lines.join("\n")}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
