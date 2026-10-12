import { afterEach, expect, it } from "vitest";
import { hasTeamActivation, teamAccessStorageKey } from "./team-activation";

const PUBLIC_KEY = "fb_pub_widget";

afterEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

it("activates for unexpired stored access or the reflet-team query parameter only", () => {
  expect(hasTeamActivation(PUBLIC_KEY)).toBe(false);

  localStorage.setItem(
    teamAccessStorageKey(PUBLIC_KEY),
    JSON.stringify({ expiresAt: Date.now() - 1, token: "fb_team_x" })
  );
  expect(hasTeamActivation(PUBLIC_KEY)).toBe(false);

  localStorage.setItem(teamAccessStorageKey(PUBLIC_KEY), "not json");
  expect(hasTeamActivation(PUBLIC_KEY)).toBe(false);

  localStorage.setItem(
    teamAccessStorageKey(PUBLIC_KEY),
    JSON.stringify({ expiresAt: Date.now() + 60_000, token: "fb_team_x" })
  );
  expect(hasTeamActivation(PUBLIC_KEY)).toBe(true);
  expect(hasTeamActivation("fb_pub_other")).toBe(false);

  window.history.replaceState(null, "", "/?reflet-team");
  expect(hasTeamActivation("fb_pub_other")).toBe(true);
});
