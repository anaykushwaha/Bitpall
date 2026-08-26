import type { InterpretResult } from "@bitpall/interpreter";
import { formatRequirement } from "../../lib/format";

interface DetectionSummaryProps {
  result: InterpretResult | null;
}

export function DetectionSummary({ result }: DetectionSummaryProps) {
  return (
    <section className="panel detection-panel">
      <h2>Detection</h2>
      {!result ? (
        <p className="muted">Run Simulation to see matched rules, confidence, and sources.</p>
      ) : result.ruleResults.length === 0 ? (
        <p className="muted">No rules in the current policy.</p>
      ) : (
        <div className="stack">
          {result.ruleResults.map((rule) => (
            <article key={`${rule.workspaceName}:${rule.ruleName}`} className="summary-card">
              <div className="summary-row">
                <span className="label">Rule</span>
                <strong>{rule.ruleName}</strong>
              </div>
              <div className="summary-row">
                <span className="label">Status</span>
                <strong className={rule.matched ? "status-match" : "status-miss"}>
                  {rule.matched ? "MATCHED" : "NO MATCH"}
                </strong>
              </div>
              <div className="summary-row">
                <span className="label">Confidence</span>
                <span>{Math.round(rule.confidence * 100)}%</span>
              </div>
              <div className="summary-row">
                <span className="label">Sources</span>
                <span>{rule.sources}</span>
              </div>
              <div className="summary-row">
                <span className="label">Events matched</span>
                <span>{rule.matchedEventIds.length}</span>
              </div>
              <p className="muted reason">{rule.reason}</p>

              {rule.requirementEvaluations.length > 0 ? (
                <div className="eval-block">
                  <h3 className="group-title">Requirements</h3>
                  <ul className="eval-list">
                    {rule.requirementEvaluations.map((requirement, index) => (
                      <li
                        key={`${requirement.metric}-${index}`}
                        className={requirement.passed ? "status-match" : "status-miss"}
                      >
                        <span aria-hidden="true">{requirement.passed ? "✓" : "✗"}</span>{" "}
                        {formatRequirement(requirement)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : rule.matched ? (
                <p className="muted">No requirements were defined for this rule.</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
