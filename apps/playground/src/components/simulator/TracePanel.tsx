import type { InterpretResult } from "@aegisscript/interpreter";

interface TracePanelProps {
  result: InterpretResult | null;
}

export function TracePanel({ result }: TracePanelProps) {
  return (
    <section className="panel">
      <h2>Detection trace</h2>
      {!result ? (
        <p className="muted">Run Simulation to see the detailed interpreter trace.</p>
      ) : (
        <pre className="trace">
          {result.trace.map((entry) => `[${entry.ruleName}] ${entry.message}`).join("\n") ||
            "No trace entries."}
        </pre>
      )}
    </section>
  );
}
