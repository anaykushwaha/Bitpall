import type { ActionResult, ActionStatus, ResponseActionType } from "@bitpall/runtime";
import type {
  ConditionEvaluation,
  JsonValue,
  MockSecurityEvent,
  RequirementEvaluation,
} from "@bitpall/interpreter";

const ACTION_LABELS: Record<ResponseActionType, string> = {
  isolate_endpoint: "Isolate endpoint",
  preserve_evidence: "Preserve evidence",
  terminate_process: "Terminate process",
  reconnect_endpoint: "Reconnect endpoint",
  revoke_sessions: "Revoke sessions",
  disable_account: "Disable account",
  reenable_account: "Re-enable account",
};

const STATUS_LABELS: Record<ActionStatus, string> = {
  simulated: "Simulated",
  pending_approval: "Pending approval",
  rejected: "Failed",
  recorded_rollback: "Rollback recorded",
};

export function formatActionLabel(type: ResponseActionType, target?: string): string {
  const base = ACTION_LABELS[type] ?? type;
  return target ? `${base} (${target})` : base;
}

export function formatActionStatus(status: ActionStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function statusGlyph(status: ActionStatus): string {
  switch (status) {
    case "simulated":
      return "✓";
    case "pending_approval":
      return "⏳";
    case "recorded_rollback":
      return "↩";
    case "rejected":
      return "✗";
  }
}

export function formatJsonValue(value: JsonValue | undefined): string {
  if (value === undefined) return "<missing>";
  if (typeof value === "string") return JSON.stringify(value);
  return String(value);
}

export function formatCondition(condition: ConditionEvaluation): string {
  return `${condition.field} ${formatJsonValue(condition.actual)} ${condition.operator} ${formatJsonValue(condition.expected)}`;
}

export function formatRequirement(requirement: RequirementEvaluation): string {
  if (requirement.metric === "confidence") {
    const actual = `${Math.round(requirement.actual * 100)}%`;
    const expected = `${Math.round(requirement.expected * 100)}%`;
    return `confidence ${actual} ${requirement.operator} ${expected}`;
  }
  return `sources ${requirement.actual} ${requirement.operator} ${requirement.expected}`;
}

export function describeEvent(event: MockSecurityEvent | undefined): string {
  if (!event) return "unknown event";
  const props = event.properties;
  const processName = nestedString(props, ["process", "name"]);
  const filePath = nestedString(props, ["file", "path"]);
  const fileExt = nestedString(props, ["file", "extension"]);
  const userName = nestedString(props, ["user", "name"]);
  const destination = nestedString(props, ["network", "destination"]);
  const detail = processName ?? filePath ?? fileExt ?? userName ?? destination;
  return detail ? `${event.type} · ${detail}` : event.type;
}

export function formatTimestamp(value: string | number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(11, 19);
}

export function groupActions(results: readonly ActionResult[]) {
  return {
    simulated: results.filter((r) => r.status === "simulated"),
    pending: results.filter((r) => r.status === "pending_approval"),
    rolledBack: results.filter((r) => r.status === "recorded_rollback"),
    failed: results.filter((r) => r.status === "rejected"),
  };
}

function nestedString(value: unknown, path: string[]): string | undefined {
  let current: unknown = value;
  for (const key of path) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : undefined;
}
