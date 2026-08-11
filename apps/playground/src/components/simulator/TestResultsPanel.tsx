import type { TestRunResult } from "@aegisscript/test-runner";

interface TestResultsPanelProps {
  result: TestRunResult | null;
}

export function TestResultsPanel({ result }: TestResultsPanelProps) {
  return (
    <section className="panel">
      <h2>Tests</h2>
      {!result ? (
        <p className="muted">Run Tests to evaluate expect rule assertions.</p>
      ) : result.tests.length === 0 ? (
        <p className="muted">No test declarations in the policy.</p>
      ) : (
        <ul>
          {result.tests.map((test) => (
            <li key={`${test.workspaceName}:${test.testName}`}>
              <strong>{test.passed ? "PASS" : "FAIL"}</strong> {test.testName}
              <ul>
                {test.assertions.map((assertion) => (
                  <li key={`${test.testName}:${assertion.ruleName}`}>
                    expect rule {assertion.ruleName} to_match — actual=
                    {String(assertion.actual)} — {assertion.message}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
