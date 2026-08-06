import type {
  ProgramNode,
  RequireClauseNode,
  RuleDeclarationNode,
  WorkspaceDeclarationNode,
} from "@aegisscript/ast";
import {
  MockResponseExecutor,
  type ActionResult,
  type AuditEntry,
  type ResponseAction,
  type ResponseExecutor,
} from "@aegisscript/runtime";
import {
  aggregateConfidence,
  countDistinctSources,
  eventMatchesTypeAndCondition,
} from "./evaluate.js";
import { eventTimeMs, type MockSecurityEvent } from "./events.js";

export interface TraceEntry {
  readonly timestamp: string;
  readonly ruleName: string;
  readonly message: string;
  readonly eventIds?: readonly string[];
}

export interface RuleMatchResult {
  readonly ruleName: string;
  readonly matched: boolean;
  readonly reason: string;
  readonly matchedEventIds: readonly string[];
  readonly confidence: number;
  readonly sources: number;
  readonly responses: readonly ActionResult[];
}

export interface InterpretResult {
  readonly ruleResults: readonly RuleMatchResult[];
  readonly trace: readonly TraceEntry[];
  readonly auditLog: readonly AuditEntry[];
  readonly pendingApprovals: readonly ActionResult[];
  readonly rollbackActions: readonly ActionResult[];
}

export interface InterpretOptions {
  readonly executor?: ResponseExecutor;
}

function compareRequirement(metricValue: number, clause: RequireClauseNode): boolean {
  const threshold = clause.value.value;
  switch (clause.operator) {
    case "==":
      return metricValue === threshold;
    case "!=":
      return metricValue !== threshold;
    case ">":
      return metricValue > threshold;
    case ">=":
      return metricValue >= threshold;
    case "<":
      return metricValue < threshold;
    case "<=":
      return metricValue <= threshold;
  }
}

function evaluateRule(
  workspace: WorkspaceDeclarationNode,
  rule: RuleDeclarationNode,
  events: readonly MockSecurityEvent[],
  executor: ResponseExecutor,
  trace: TraceEntry[],
): RuleMatchResult {
  const ruleName = rule.name.name;
  const workspaceName = workspace.name.name;

  if (!rule.observe) {
    return {
      ruleName,
      matched: false,
      reason: "Rule has no observe stage",
      matchedEventIds: [],
      confidence: 0,
      sources: 0,
      responses: [],
    };
  }

  const observeMatches = events.filter((event) =>
    eventMatchesTypeAndCondition(event, rule.observe!.eventType.name, rule.observe!.condition),
  );

  if (observeMatches.length === 0) {
    trace.push({
      timestamp: new Date(0).toISOString(),
      ruleName,
      message: "Observe stage did not match any events",
    });
    return {
      ruleName,
      matched: false,
      reason: "Observe stage did not match",
      matchedEventIds: [],
      confidence: 0,
      sources: 0,
      responses: [],
    };
  }

  const observeEvent = observeMatches[0]!;
  const observeTime = eventTimeMs(observeEvent);
  const chain: MockSecurityEvent[] = [observeEvent];

  trace.push({
    timestamp: new Date(observeTime).toISOString(),
    ruleName,
    message: `Observe matched event '${observeEvent.id}' (${observeEvent.type})`,
    eventIds: [observeEvent.id],
  });

  for (const thenStage of rule.thenStages) {
    const windowEnd = observeTime + thenStage.within.milliseconds;
    const thenMatch = events.find((event) => {
      if (chain.some((c) => c.id === event.id)) return false;
      const t = eventTimeMs(event);
      if (t < observeTime || t > windowEnd) return false;
      return eventMatchesTypeAndCondition(event, thenStage.eventType.name, thenStage.condition);
    });

    if (!thenMatch) {
      const outside = events.find((event) => {
        if (chain.some((c) => c.id === event.id)) return false;
        return eventMatchesTypeAndCondition(event, thenStage.eventType.name, thenStage.condition);
      });
      const reason = outside
        ? `Then stage '${thenStage.eventType.name}' matched outside the ${thenStage.within.raw} window`
        : `Then stage '${thenStage.eventType.name}' condition did not match`;
      trace.push({
        timestamp: new Date(0).toISOString(),
        ruleName,
        message: reason,
      });
      return {
        ruleName,
        matched: false,
        reason,
        matchedEventIds: chain.map((e) => e.id),
        confidence: aggregateConfidence(chain),
        sources: countDistinctSources(chain),
        responses: [],
      };
    }

    chain.push(thenMatch);
    trace.push({
      timestamp: new Date(eventTimeMs(thenMatch)).toISOString(),
      ruleName,
      message: `Then matched event '${thenMatch.id}' within ${thenStage.within.raw}`,
      eventIds: [thenMatch.id],
    });
  }

  const confidence = aggregateConfidence(chain);
  const sources = countDistinctSources(chain);

  for (const req of rule.requires) {
    const value = req.metric === "confidence" ? confidence : sources;
    if (!compareRequirement(value, req)) {
      const reason = `Requirement failed: ${req.metric} ${req.operator} ${req.value.value} (actual ${value})`;
      trace.push({
        timestamp: new Date(0).toISOString(),
        ruleName,
        message: reason,
        eventIds: chain.map((e) => e.id),
      });
      return {
        ruleName,
        matched: false,
        reason,
        matchedEventIds: chain.map((e) => e.id),
        confidence,
        sources,
        responses: [],
      };
    }
  }

  trace.push({
    timestamp: new Date(0).toISOString(),
    ruleName,
    message: `Rule matched with confidence=${confidence}, sources=${sources}`,
    eventIds: chain.map((e) => e.id),
  });

  const responses: ActionResult[] = [];
  const approvalGates = new Set<string>();

  if (rule.respond) {
    for (const statement of rule.respond.statements) {
      if (statement.kind === "ApprovalRequirement") {
        approvalGates.add(statement.actionName.name);
      }
    }

    for (const statement of rule.respond.statements) {
      let action: ResponseAction | null = null;
      if (statement.kind === "IsolateAction") {
        action = {
          type: "isolate_endpoint",
          target: statement.target.name,
          ruleName,
          workspaceName,
        };
      } else if (statement.kind === "PreserveEvidenceAction") {
        action = {
          type: "preserve_evidence",
          ruleName,
          workspaceName,
        };
      } else if (statement.kind === "ApprovalRequirement") {
        action = {
          type: statement.actionName.name as ResponseAction["type"],
          requiresApproval: true,
          ruleName,
          workspaceName,
        };
      }

      if (action) {
        if (approvalGates.has(action.type) && action.type !== "terminate_process") {
          action = { ...action, requiresApproval: true };
        }
        const result = executor.execute(action, {
          workspaceName,
          ruleName,
          eventIds: chain.map((e) => e.id),
          simulated: true,
        });
        responses.push(result);
        trace.push({
          timestamp: result.timestamp,
          ruleName,
          message: result.message,
          eventIds: chain.map((e) => e.id),
        });
      }
    }
  }

  if (rule.rollback) {
    for (const statement of rule.rollback.statements) {
      if (statement.kind === "ReconnectAction") {
        const result = executor.execute(
          {
            type: "reconnect_endpoint",
            target: statement.target.name,
            ruleName,
            workspaceName,
          },
          {
            workspaceName,
            ruleName,
            eventIds: chain.map((e) => e.id),
            simulated: true,
          },
        );
        responses.push(result);
        trace.push({
          timestamp: result.timestamp,
          ruleName,
          message: result.message,
          eventIds: chain.map((e) => e.id),
        });
      }
    }
  }

  return {
    ruleName,
    matched: true,
    reason: "All stages and requirements satisfied",
    matchedEventIds: chain.map((e) => e.id),
    confidence,
    sources,
    responses,
  };
}

export function interpret(
  program: ProgramNode,
  events: readonly MockSecurityEvent[],
  options: InterpretOptions = {},
): InterpretResult {
  const executor = options.executor ?? new MockResponseExecutor();
  const trace: TraceEntry[] = [];
  const ruleResults: RuleMatchResult[] = [];

  let ordered: MockSecurityEvent[];
  try {
    ordered = [...events].sort((a, b) => eventTimeMs(a) - eventTimeMs(b));
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }

  for (const workspace of program.workspaces) {
    for (const member of workspace.members) {
      if (member.kind === "RuleDeclaration") {
        ruleResults.push(evaluateRule(workspace, member, ordered, executor, trace));
      }
    }
  }

  return {
    ruleResults,
    trace,
    auditLog: executor.getAuditLog(),
    pendingApprovals: executor.getPendingApprovals(),
    rollbackActions: executor.getRollbackActions(),
  };
}
