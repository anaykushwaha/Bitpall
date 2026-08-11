import type { TestRunResult } from "@aegisscript/test-runner";

interface TestResultsPanelProps {
  result: TestRunResult | null;
}

export function TestResultsPanel({ result }: TestResultsPanelProps) {
  if (!result) {
    return (
      <section className="panel">
        <h2>Test results</h2>
        <p className="muted">
          Run Tests to evaluate expect rule assertions separately from simulation.
        </p>
      </section>
    );
  }

  const passed = result.tests.filter((test) => test.passed).length;
  const failed = result.tests.length - passed;

  return (
    <section className="panel">
      <h2>Test results</h2>
      {result.tests.length === 0 ? (
        <p className="muted">No test declarations in the policy.</p>
      ) : (
        <>
          <ul className="test-list">
            {result.tests.map((test) => (
              <li key={`${test.workspaceName}:${test.testName}`}>
                <strong className={test.passed ? "status-match" : "status-miss"}>
                  {test.passed ? "PASS" : "FAIL"}
                </strong>{" "}
                {test.testName}
              </li>
            ))}
          </ul>
          <p className="test-summary">
            {passed} passed · {failed} failed
          </p>
        </>
      )}
    </section>
  );
}
