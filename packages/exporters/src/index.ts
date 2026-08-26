/**
 * Deterministic export of Bitpall detection/response documentation.
 */
import type { ProgramNode } from "@bitpall/ast";
import type { InterpretResult, MockSecurityEvent } from "@bitpall/interpreter";
import { exportMarkdownReport, type MarkdownExportOptions } from "./markdown.js";

export type { MarkdownExportOptions } from "./markdown.js";
export { exportMarkdownReport } from "./markdown.js";
export { escapeInline, escapeTableCell } from "./markdown-escape.js";

export interface ExportRequest {
  readonly program: ProgramNode;
  readonly format: "markdown" | "json";
  readonly result: InterpretResult;
  readonly events?: readonly MockSecurityEvent[];
  readonly scenarioName?: string;
  readonly ruleName?: string;
}

/**
 * Export Bitpall analysis output as documentation.
 * Currently only the Markdown format is implemented.
 */
export function exportDocumentation(request: ExportRequest): string {
  if (request.format !== "markdown") {
    throw new Error(
      `@bitpall/exporters does not implement format '${request.format}'. Use format: "markdown".`,
    );
  }
  const options: MarkdownExportOptions = {
    program: request.program,
    result: request.result,
    events: request.events,
    scenarioName: request.scenarioName,
    ruleName: request.ruleName,
  };
  return exportMarkdownReport(options);
}
