import type { InterpretResult, MockSecurityEvent } from "@bitpall/interpreter";
import { describeEvent, formatCondition, formatTimestamp } from "../../lib/format";

interface EventChainProps {
  result: InterpretResult | null;
  events: readonly MockSecurityEvent[];
}

export function EventChain({ result, events }: EventChainProps) {
  const primary = result?.ruleResults[0];
  const matched = result?.ruleResults.find((rule) => rule.matched) ?? null;
  const explained = matched ?? (primary && primary.stageExplanations.length > 0 ? primary : null);
  const byId = new Map(events.map((event) => [event.id, event]));

  return (
    <section className="panel">
      <h2>Event chain</h2>
      {!result ? (
        <p className="muted">Run Simulation to visualize the matched detection chain.</p>
      ) : !explained ? (
        <p className="muted">No complete event chain matched this policy.</p>
      ) : (
        <>
          {!matched ? (
            <p className="muted">
              Partial chain from the last attempt — the policy did not fully match.
            </p>
          ) : null}
          <ol className="event-chain">
            {explained.stageExplanations.map((stage, index) => {
              const event = byId.get(stage.eventId);
              const label =
                stage.stageKind === "observe"
                  ? `Stage ${stage.stageIndex + 1} — Observe ${stage.eventType}`
                  : `Stage ${stage.stageIndex + 1} — Then ${stage.eventType}`;
              return (
                <li key={`${stage.eventId}-${stage.stageIndex}`}>
                  <div className="chain-node">
                    <strong className={stage.matched ? "status-match" : "status-miss"}>
                      {stage.matched ? "✓" : "✗"} {label}
                    </strong>
                    <span className="muted">
                      {event ? formatTimestamp(event.timestamp) : "—"} · {stage.eventId}
                      {stage.within ? ` · within ${stage.within}` : ""}
                    </span>
                    <span>{describeEvent(event)}</span>
                    {stage.conditions.length > 0 ? (
                      <ul className="eval-list">
                        {stage.conditions.map((condition, conditionIndex) => (
                          <li
                            key={`${stage.eventId}-${condition.field}-${conditionIndex}`}
                            className={condition.passed ? "status-match" : "status-miss"}
                          >
                            <span aria-hidden="true">{condition.passed ? "✓" : "✗"}</span>{" "}
                            {formatCondition(condition)}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  {index < explained.stageExplanations.length - 1 ? (
                    <div className="chain-arrow" aria-hidden="true">
                      ↓
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
