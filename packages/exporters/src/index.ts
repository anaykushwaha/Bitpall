/**
 * Planned package: deterministic export of detection/response documentation.
 * Not implemented in the initial vertical slice.
 */
import type { ProgramNode } from "@aegisscript/ast";

export interface ExportRequest {
  readonly program: ProgramNode;
  readonly format: "markdown" | "json";
}

export function exportDocumentation(_request: ExportRequest): string {
  throw new Error(
    "@aegisscript/exporters is scaffolded only. No export formats are implemented yet.",
  );
}
