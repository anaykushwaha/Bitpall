import type { InterpretResult } from "@bitpall/interpreter";
import { formatActionLabel, formatActionStatus, groupActions, statusGlyph } from "../../lib/format";

interface ResponsePanelProps {
  result: InterpretResult | null;
}

export function ResponsePanel({ result }: ResponsePanelProps) {
  const matched = result?.ruleResults.some((rule) => rule.matched) ?? false;
  const actions = result
    ? [
        ...result.auditLog
          .map((entry) => entry.result)
          .filter((action) => action.status !== "recorded_rollback"),
        ...result.rollbackActions,
      ]
    : [];
  const grouped = groupActions(actions);

  return (
    <section className="panel">
      <h2>Response plan</h2>
      {!result ? (
        <p className="muted">Run Simulation to inspect simulated responses.</p>
      ) : !matched ? (
        <p className="muted">No response actions were planned — the policy did not match.</p>
      ) : actions.length === 0 ? (
        <p className="muted">No response actions were planned for this rule.</p>
      ) : (
        <div className="stack">
          <ActionGroup title="Simulated" items={grouped.simulated} />
          <ActionGroup title="Pending approval" items={grouped.pending} />
          <ActionGroup title="Rollback recorded" items={grouped.rolledBack} />
          <ActionGroup title="Failed" items={grouped.failed} />
        </div>
      )}
    </section>
  );
}

function ActionGroup({
  title,
  items,
}: {
  title: string;
  items: ReturnType<typeof groupActions>["simulated"];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="group-title">{title}</h3>
      <ul className="action-list">
        {items.map((item, index) => (
          <li key={`${item.action.type}-${item.status}-${index}`}>
            <span className="glyph" aria-hidden="true">
              {statusGlyph(item.status)}
            </span>
            <div>
              <strong>{formatActionLabel(item.action.type, item.action.target)}</strong>
              <div className="muted">
                {formatActionStatus(item.status)} — {item.message}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
