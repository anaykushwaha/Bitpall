import type { SourceRange } from "./source.js";

/**
 * Diagnostic code convention:
 * BITPALL1xxx — lexer
 * BITPALL2xxx — parser
 * BITPALL3xxx — checker
 * BITPALL4xxx — runtime / interpreter
 */
export type DiagnosticSeverity = "error" | "warning" | "info";

export type DiagnosticCode =
  | "BITPALL1001"
  | "BITPALL1002"
  | "BITPALL1003"
  | "BITPALL2001"
  | "BITPALL2002"
  | "BITPALL2003"
  | "BITPALL2004"
  | "BITPALL3001"
  | "BITPALL3002"
  | "BITPALL3003"
  | "BITPALL3004"
  | "BITPALL3005"
  | "BITPALL3006"
  | "BITPALL3007"
  | "BITPALL3008"
  | "BITPALL3009"
  | "BITPALL3010"
  | "BITPALL3011"
  | "BITPALL3012"
  | "BITPALL3013"
  | "BITPALL3014"
  | "BITPALL4001"
  | "BITPALL4002"
  | "BITPALL4003";

export interface RelatedLocation {
  readonly fileName: string;
  readonly range: SourceRange;
  readonly message: string;
}

export interface Diagnostic {
  readonly code: DiagnosticCode;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly fileName: string;
  readonly range: SourceRange;
  readonly suggestion?: string;
  readonly related?: RelatedLocation[];
}

export function createDiagnostic(input: Diagnostic): Diagnostic {
  return input;
}

export function formatDiagnostic(diagnostic: Diagnostic): string {
  const { fileName, range, severity, code, message } = diagnostic;
  const location = `${fileName}:${range.start.line}:${range.start.column}`;
  return `${location}: ${severity} ${code}: ${message}`;
}
