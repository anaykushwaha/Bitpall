import { describe, expect, it } from "vitest";
import { exportDocumentation } from "../src/index.js";

describe("exporters scaffold", () => {
  it("documents that exporters are not implemented", () => {
    expect(() =>
      exportDocumentation({
        format: "markdown",
        program: {
          kind: "Program",
          range: {
            start: { line: 1, column: 1, offset: 0 },
            end: { line: 1, column: 1, offset: 0 },
          },
          workspaces: [],
        },
      }),
    ).toThrow(/scaffolded only/i);
  });
});
