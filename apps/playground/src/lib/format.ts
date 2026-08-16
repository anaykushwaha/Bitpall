import type { ActionResult, ActionStatus, ResponseActionType } from "@bitpall/runtime";
import type { MockSecurityEvent } from "@bitpall/interpreter";

const ACTION_LABELS: Record<ResponseActionType, string> = {
  isolate_endpoint: "Endpoint isolated",
  preserve_evidence: "Evidence preserved",
  terminate_process: "Process termination",
  reconnect_endpoint: "Endpoint reconnect",
  revoke_sessions: "Sessions revoked",
  disable_account: "Account disablement",
  reenable_account: "Account re-enable",
};

const STATUS_LABELS: Record<ActionStatus, string> = {
  simulated: "Executed",
  pending_approval: "Pending approval",
  rejected: "Failed",
  recorded_rollback: "Rolled back",
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
    executed: results.filter((r) => r.status === "simulated"),
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
