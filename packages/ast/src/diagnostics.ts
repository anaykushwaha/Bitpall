import type { SourceRange } from "./source.js";

/**
 * Diagnostic code convention:
 * AEGIS1xxx — lexer
 * AEGIS2xxx — parser
 * AEGIS3xxx — checker
 * AEGIS4xxx — runtime / interpreter
 */
export type DiagnosticSeverity = "error" | "warning" | "info";

export type DiagnosticCode =
  | "AEGIS1001"
  | "AEGIS1002"
  | "AEGIS1003"
  | "AEGIS2001"
  | "AEGIS2002"
  | "AEGIS2003"
  | "AEGIS2004"
  | "AEGIS3001"
  | "AEGIS3002"
  | "AEGIS3003"
  | "AEGIS3004"
  | "AEGIS3005"
  | "AEGIS3006"
  | "AEGIS3007"
  | "AEGIS3008"
  | "AEGIS3009"
  | "AEGIS3010"
  | "AEGIS3011"
  | "AEGIS3012"
  | "AEGIS3013"
  | "AEGIS3014"
  | "AEGIS4001"
  | "AEGIS4002"
  | "AEGIS4003";

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
