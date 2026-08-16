/**
 * Planned package: deterministic export of detection/response documentation.
 * Not implemented in the initial vertical slice.
 */
import type { ProgramNode } from "@bitpall/ast";

export interface ExportRequest {
  readonly program: ProgramNode;
  readonly format: "markdown" | "json";
}

export function exportDocumentation(_request: ExportRequest): string {
  throw new Error("@bitpall/exporters is scaffolded only. No export formats are implemented yet.");
}
