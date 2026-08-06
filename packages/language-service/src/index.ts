/**
 * Narrow editor-facing facade over parse + check.
 * Full LSP support is out of scope for the initial vertical slice.
 */
import {
  createSourceFile,
  formatDiagnostic,
  type Diagnostic,
  type ProgramNode,
  type SourceFile,
} from "@aegisscript/ast";
import { check } from "@aegisscript/checker";
import { parse } from "@aegisscript/parser";

export interface AnalyzeResult {
  readonly source: SourceFile;
  readonly program: ProgramNode | null;
  readonly diagnostics: Diagnostic[];
  readonly formattedDiagnostics: string[];
}

export function analyzeSource(fileName: string, text: string): AnalyzeResult {
  const source = createSourceFile(fileName, text);
  const parsed = parse(source);
  const diagnostics = [...parsed.diagnostics];
  let program = parsed.program;
  if (program) {
    const checked = check(program, source);
    diagnostics.push(...checked.diagnostics);
    program = checked.program;
  }
  return {
    source,
    program,
    diagnostics,
    formattedDiagnostics: diagnostics.map(formatDiagnostic),
  };
}
