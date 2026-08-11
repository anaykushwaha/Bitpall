import type {
  ActionResult,
  AuditEntry,
  ExecutionContext,
  ResponseAction,
  ResponseExecutor,
} from "./types.js";

const SUPPORTED = new Set([
  "isolate_endpoint",
  "preserve_evidence",
  "terminate_process",
  "reconnect_endpoint",
  "revoke_sessions",
  "disable_account",
  "reenable_account",
]);

const ALWAYS_PENDING = new Set(["terminate_process", "disable_account"]);

/**
 * Simulation-only executor. Never contacts real security platforms or devices.
 */
export class MockResponseExecutor implements ResponseExecutor {
  private readonly audit: AuditEntry[] = [];
  private readonly pending: ActionResult[] = [];
  private readonly rollbacks: ActionResult[] = [];
  private sequence = 0;

  execute(action: ResponseAction, context: ExecutionContext): ActionResult {
    void context;
    const timestamp = new Date(0).toISOString();

    if (!SUPPORTED.has(action.type)) {
      const result: ActionResult = {
        action,
        status: "rejected",
        message: `Unsupported or unsafe action '${action.type}' rejected by default-deny policy`,
        timestamp,
      };
      this.record(result);
      return result;
    }

    if (action.type === "reconnect_endpoint" || action.type === "reenable_account") {
      const label =
        action.type === "reconnect_endpoint"
          ? `reconnect endpoint '${action.target ?? "unknown"}'`
          : `reenable account '${action.target ?? "unknown"}'`;
      const result: ActionResult = {
        action,
        status: "recorded_rollback",
        message: `Recorded rollback: ${label} (simulation only)`,
        timestamp,
      };
      this.rollbacks.push(result);
      this.record(result);
      return result;
    }

    if (action.requiresApproval || ALWAYS_PENDING.has(action.type)) {
      const result: ActionResult = {
        action: { ...action, requiresApproval: true },
        status: "pending_approval",
        message: `Action '${action.type}' requires approval and was not executed`,
        timestamp,
      };
      this.pending.push(result);
      this.record(result);
      return result;
    }

    const result: ActionResult = {
      action,
      status: "simulated",
      message: `Simulated action '${action.type}'${action.target ? ` on '${action.target}'` : ""} — no real system was modified`,
      timestamp,
    };
    this.record(result);
    return result;
  }

  getAuditLog(): readonly AuditEntry[] {
    return this.audit;
  }

  getPendingApprovals(): readonly ActionResult[] {
    return this.pending;
  }

  getRollbackActions(): readonly ActionResult[] {
    return this.rollbacks;
  }

  private record(result: ActionResult): void {
    this.sequence += 1;
    this.audit.push({
      id: `audit-${String(this.sequence).padStart(4, "0")}`,
      result,
    });
  }
}
