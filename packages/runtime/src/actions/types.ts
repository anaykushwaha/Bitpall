export type ResponseActionType =
  | "isolate_endpoint"
  | "preserve_evidence"
  | "terminate_process"
  | "reconnect_endpoint"
  | "revoke_sessions"
  | "disable_account"
  | "reenable_account";

export type ActionStatus = "simulated" | "pending_approval" | "rejected" | "recorded_rollback";

export interface ResponseAction {
  readonly type: ResponseActionType;
  readonly target?: string;
  readonly requiresApproval?: boolean;
  readonly ruleName: string;
  readonly workspaceName: string;
}

export interface ExecutionContext {
  readonly workspaceName: string;
  readonly ruleName: string;
  readonly eventIds: readonly string[];
  readonly simulated: true;
}

export interface ActionResult {
  readonly action: ResponseAction;
  readonly status: ActionStatus;
  readonly message: string;
  readonly timestamp: string;
}

export interface AuditEntry {
  readonly id: string;
  readonly result: ActionResult;
}

export interface ResponseExecutor {
  execute(action: ResponseAction, context: ExecutionContext): ActionResult;
  getAuditLog(): readonly AuditEntry[];
  getPendingApprovals(): readonly ActionResult[];
  getRollbackActions(): readonly ActionResult[];
}
