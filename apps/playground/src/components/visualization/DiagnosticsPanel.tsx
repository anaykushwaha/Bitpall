import { formatDiagnostic, type Diagnostic } from "@bitpall/ast";

interface DiagnosticsPanelProps {
  diagnostics: Diagnostic[];
}

export function DiagnosticsPanel({ diagnostics }: DiagnosticsPanelProps) {
  return (
    <section className="panel">
      <h2>Diagnostics</h2>
      {diagnostics.length === 0 ? (
        <p className="muted">No diagnostics.</p>
      ) : (
        <ul>
          {diagnostics.map((diagnostic, index) => (
            <li
              key={`${diagnostic.code}-${diagnostic.range.start.offset}-${index}`}
              className={diagnostic.severity === "error" ? "diag-error" : "diag-warning"}
            >
              {formatDiagnostic(diagnostic)}
              {diagnostic.suggestion ? ` Suggestion: ${diagnostic.suggestion}` : ""}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
