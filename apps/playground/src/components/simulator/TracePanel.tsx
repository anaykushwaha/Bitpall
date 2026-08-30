import type { InterpretResult } from "@bitpall/interpreter";

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
        <pre className="dev-output dev-output--trace">
          {result.trace.map((entry) => `[${entry.ruleName}] ${entry.message}`).join("\n") ||
            "No trace entries."}
        </pre>
      )}
    </section>
  );
}
