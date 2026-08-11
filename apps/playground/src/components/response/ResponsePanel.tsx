import type { InterpretResult } from "@aegisscript/interpreter";
import { formatActionLabel, formatActionStatus, groupActions, statusGlyph } from "../../lib/format";

interface ResponsePanelProps {
  result: InterpretResult | null;
}

export function ResponsePanel({ result }: ResponsePanelProps) {
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
      ) : actions.length === 0 ? (
        <p className="muted">No responses proposed (rule did not match or has no respond block).</p>
      ) : (
        <div className="stack">
          <ActionGroup title="Executed" items={grouped.executed} />
          <ActionGroup title="Pending approval" items={grouped.pending} />
          <ActionGroup title="Rolled back" items={grouped.rolledBack} />
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
  items: ReturnType<typeof groupActions>["executed"];
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
