import { describe, expect, it } from "vitest";
import { runAegisTests } from "../src/index.js";

describe("test-runner scaffold", () => {
  it("documents that the package is not yet implemented", () => {
    expect(() =>
      runAegisTests({
        program: {
          kind: "Program",
          range: {
            start: { line: 1, column: 1, offset: 0 },
            end: { line: 1, column: 1, offset: 0 },
          },
          workspaces: [],
        },
        events: [],
      }),
    ).toThrow(/scaffolded only/i);
  });
});
