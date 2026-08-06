import type { InterpretResult } from "@aegisscript/interpreter";

interface ResponsePanelProps {
  result: InterpretResult | null;
}

export function ResponsePanel({ result }: ResponsePanelProps) {
  return (
    <section className="panel">
      <h2>Proposed response actions</h2>
      {!result ? (
        <p className="muted">Run Simulation to inspect simulated responses.</p>
      ) : (
        <pre>
          {JSON.stringify(
            {
              auditLog: result.auditLog,
              pendingApprovals: result.pendingApprovals,
              rollbackActions: result.rollbackActions,
            },
            null,
            2,
          )}
        </pre>
      )}
    </section>
  );
}
