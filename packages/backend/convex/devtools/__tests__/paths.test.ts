import { expect, test } from "vitest";
import { PROXIED_API_PATHS } from "../../../../sdk/src/devtools/protocol";
import { DEVTOOLS_TOKEN_API_PATHS } from "../constants";

test("devtools tokens reach exactly the paths the SDK proxy forwards", () => {
  expect([...DEVTOOLS_TOKEN_API_PATHS].sort()).toEqual(
    [...PROXIED_API_PATHS].sort()
  );
});
