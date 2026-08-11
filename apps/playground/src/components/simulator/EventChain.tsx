import type { InterpretResult, MockSecurityEvent } from "@aegisscript/interpreter";
import { describeEvent, formatTimestamp } from "../../lib/format";

interface EventChainProps {
  result: InterpretResult | null;
  events: readonly MockSecurityEvent[];
}

export function EventChain({ result, events }: EventChainProps) {
  const matched = result?.ruleResults.find((rule) => rule.matched);
  const byId = new Map(events.map((event) => [event.id, event]));

  return (
    <section className="panel">
      <h2>Event chain</h2>
      {!result ? (
        <p className="muted">Run Simulation to visualize the matched detection chain.</p>
      ) : !matched ? (
        <p className="muted">No successful chain for the current event stream.</p>
      ) : (
        <ol className="event-chain">
          {matched.matchedEventIds.map((id, index) => {
            const event = byId.get(id);
            return (
              <li key={id}>
                <div className="chain-node">
                  <strong>{event?.type ?? id}</strong>
                  <span className="muted">
                    {event ? formatTimestamp(event.timestamp) : "—"} · {id}
                  </span>
                  <span>{describeEvent(event)}</span>
                </div>
                {index < matched.matchedEventIds.length - 1 ? (
                  <div className="chain-arrow" aria-hidden="true">
                    ↓
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
