import type { InterpretResult } from "@aegisscript/interpreter";

interface TracePanelProps {
  result: InterpretResult | null;
}

export function TracePanel({ result }: TracePanelProps) {
  return (
    <section className="panel">
      <h2>Execution trace</h2>
      {!result ? (
        <p className="muted">Run Simulation to see the trace.</p>
      ) : (
        <>
          <ul>
            {result.ruleResults.map((rule) => (
              <li key={rule.ruleName}>
                <strong>{rule.matched ? "MATCH" : "NO MATCH"}</strong> {rule.ruleName}:{" "}
                {rule.reason}
              </li>
            ))}
          </ul>
          <pre>
            {result.trace.map((entry) => `[${entry.ruleName}] ${entry.message}`).join("\n")}
          </pre>
        </>
      )}
    </section>
  );
}
