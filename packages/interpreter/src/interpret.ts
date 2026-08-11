import type {
  ProgramNode,
  RequireClauseNode,
  RuleDeclarationNode,
  ThenStageNode,
  WorkspaceDeclarationNode,
} from "@aegisscript/ast";
import {
  MockResponseExecutor,
  type ActionResult,
  type AuditEntry,
  type ResponseAction,
  type ResponseExecutor,
} from "@aegisscript/runtime";
import { chainConfidence, countDistinctSources, eventMatchesTypeAndCondition } from "./evaluate.js";
import { eventTimeMs, orderEvents, type MockSecurityEvent } from "./events.js";

export interface TraceEntry {
  readonly timestamp: string;
  readonly ruleName: string;
  readonly message: string;
  readonly eventIds?: readonly string[];
}

export interface RuleMatchResult {
  readonly workspaceName: string;
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

interface ChainAttempt {
  readonly matched: boolean;
  readonly reason: string;
  readonly chain: readonly MockSecurityEvent[];
  readonly confidence: number;
  readonly sources: number;
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

/** Collect declared telemetry `source` string values from a workspace. */
export function collectTelemetrySources(workspace: WorkspaceDeclarationNode): Set<string> {
  const sources = new Set<string>();
  for (const member of workspace.members) {
    if (member.kind !== "TelemetryDeclaration") continue;
    for (const property of member.properties) {
      if (property.name.name === "source" && property.value.kind === "StringLiteral") {
        sources.add(property.value.value);
      }
    }
  }
  return sources;
}

function isDeclaredTelemetry(
  event: MockSecurityEvent,
  allowedSources: ReadonlySet<string>,
): boolean {
  return typeof event.source === "string" && allowedSources.has(event.source);
}

function requirementsPass(
  rule: RuleDeclarationNode,
  chain: readonly MockSecurityEvent[],
):
  | { ok: true; confidence: number; sources: number }
  | { ok: false; reason: string; confidence: number; sources: number } {
  const confidence = chainConfidence(chain);
  const sources = countDistinctSources(chain);
  for (const req of rule.requires) {
    const value = req.metric === "confidence" ? confidence : sources;
    if (!compareRequirement(value, req)) {
      return {
        ok: false,
        reason: `Requirement failed: ${req.metric} ${req.operator} ${req.value.value} (actual ${value})`,
        confidence,
        sources,
      };
    }
  }
  return { ok: true, confidence, sources };
}

function thenCandidates(
  stage: ThenStageNode,
  observeTime: number,
  previousTime: number,
  chain: readonly MockSecurityEvent[],
  eligible: readonly MockSecurityEvent[],
): MockSecurityEvent[] {
  const windowEnd = observeTime + stage.within.milliseconds;
  return eligible.filter((event) => {
    if (chain.some((c) => c.id === event.id)) return false;
    const t = eventTimeMs(event);
    // within is measured from observe; each stage must be at or after the previous match
    if (t < previousTime || t > windowEnd) return false;
    return eventMatchesTypeAndCondition(event, stage.eventType.name, stage.condition);
  });
}

/**
 * Depth-first search over then-stage candidates for a fixed observe event.
 * Tries candidates in chronological order; first fully successful chain wins.
 * Requirement failures backtrack to later candidates rather than failing the rule.
 */
function searchThenStages(
  rule: RuleDeclarationNode,
  observeEvent: MockSecurityEvent,
  eligible: readonly MockSecurityEvent[],
): ChainAttempt {
  const observeTime = eventTimeMs(observeEvent);
  let lastFailureReason = `No complete chain from observe candidate '${observeEvent.id}'`;
  let lastFailureChain: readonly MockSecurityEvent[] = [observeEvent];
  let lastFailureConfidence = chainConfidence([observeEvent]);
  let lastFailureSources = countDistinctSources([observeEvent]);

  function search(stageIndex: number, chain: readonly MockSecurityEvent[]): ChainAttempt | null {
    if (stageIndex >= rule.thenStages.length) {
      const req = requirementsPass(rule, chain);
      if (req.ok) {
        return {
          matched: true,
          reason: "All stages and requirements satisfied",
          chain,
          confidence: req.confidence,
          sources: req.sources,
        };
      }
      lastFailureReason = req.reason;
      lastFailureChain = chain;
      lastFailureConfidence = req.confidence;
      lastFailureSources = req.sources;
      return null;
    }

    const stage = rule.thenStages[stageIndex]!;
    const previousTime = eventTimeMs(chain[chain.length - 1]!);
    const candidates = thenCandidates(stage, observeTime, previousTime, chain, eligible);

    if (candidates.length === 0) {
      const typeMatch = eligible.find((event) => {
        if (chain.some((c) => c.id === event.id)) return false;
        return eventMatchesTypeAndCondition(event, stage.eventType.name, stage.condition);
      });
      let reason: string;
      if (!typeMatch) {
        reason = `Then stage '${stage.eventType.name}' condition did not match`;
      } else {
        const t = eventTimeMs(typeMatch);
        const windowEnd = observeTime + stage.within.milliseconds;
        if (t < previousTime) {
          reason = `Then stage '${stage.eventType.name}' occurred before the previous matched stage`;
        } else if (t > windowEnd) {
          reason = `Then stage '${stage.eventType.name}' matched outside the ${stage.within.raw} window`;
        } else {
          reason = `Then stage '${stage.eventType.name}' condition did not match`;
        }
      }
      lastFailureReason = reason;
      lastFailureChain = chain;
      lastFailureConfidence = chainConfidence(chain);
      lastFailureSources = countDistinctSources(chain);
      return null;
    }

    for (const candidate of candidates) {
      const found = search(stageIndex + 1, [...chain, candidate]);
      if (found) {
        return found;
      }
    }
    return null;
  }

  const found = search(0, [observeEvent]);
  if (found) {
    return found;
  }

  return {
    matched: false,
    reason: lastFailureReason,
    chain: lastFailureChain,
    confidence: lastFailureConfidence,
    sources: lastFailureSources,
  };
}

function buildSuccessTrace(
  ruleName: string,
  rule: RuleDeclarationNode,
  chain: readonly MockSecurityEvent[],
  confidence: number,
  sources: number,
): TraceEntry[] {
  const entries: TraceEntry[] = [];
  const observeEvent = chain[0]!;
  entries.push({
    timestamp: new Date(eventTimeMs(observeEvent)).toISOString(),
    ruleName,
    message: `Observe matched event '${observeEvent.id}' (${observeEvent.type})`,
    eventIds: [observeEvent.id],
  });

  for (let i = 0; i < rule.thenStages.length; i += 1) {
    const stage = rule.thenStages[i]!;
    const event = chain[i + 1]!;
    entries.push({
      timestamp: new Date(eventTimeMs(event)).toISOString(),
      ruleName,
      message: `Then matched event '${event.id}' within ${stage.within.raw}`,
      eventIds: [event.id],
    });
  }

  entries.push({
    timestamp: new Date(0).toISOString(),
    ruleName,
    message: `Rule matched with confidence=${confidence}, sources=${sources}`,
    eventIds: chain.map((e) => e.id),
  });

  return entries;
}

function executeResponses(
  workspace: WorkspaceDeclarationNode,
  rule: RuleDeclarationNode,
  chain: readonly MockSecurityEvent[],
  executor: ResponseExecutor,
  trace: TraceEntry[],
): ActionResult[] {
  const ruleName = rule.name.name;
  const workspaceName = workspace.name.name;
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
      } else if (statement.kind === "RevokeSessionsAction") {
        action = {
          type: "revoke_sessions",
          target: statement.target.name,
          ruleName,
          workspaceName,
        };
      } else if (statement.kind === "DisableAccountAction") {
        action = {
          type: "disable_account",
          target: statement.target.name,
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
        if (
          approvalGates.has(action.type) &&
          action.type !== "terminate_process" &&
          action.type !== "disable_account"
        ) {
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
      let action: ResponseAction | null = null;
      if (statement.kind === "ReconnectAction") {
        action = {
          type: "reconnect_endpoint",
          target: statement.target.name,
          ruleName,
          workspaceName,
        };
      } else if (statement.kind === "ReenableAccountAction") {
        action = {
          type: "reenable_account",
          target: statement.target.name,
          ruleName,
          workspaceName,
        };
      }

      if (action) {
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

  return responses;
}

function evaluateRule(
  workspace: WorkspaceDeclarationNode,
  rule: RuleDeclarationNode,
  events: readonly MockSecurityEvent[],
  allowedSources: ReadonlySet<string>,
  executor: ResponseExecutor,
  trace: TraceEntry[],
): RuleMatchResult {
  const ruleName = rule.name.name;
  const workspaceName = workspace.name.name;

  if (!rule.observe) {
    return {
      workspaceName,
      ruleName,
      matched: false,
      reason: "Rule has no observe stage",
      matchedEventIds: [],
      confidence: 0,
      sources: 0,
      responses: [],
    };
  }

  const eligible = events.filter((event) => {
    if (!isDeclaredTelemetry(event, allowedSources)) {
      const relevantToObserve = eventMatchesTypeAndCondition(
        event,
        rule.observe!.eventType.name,
        rule.observe!.condition,
      );
      const relevantToThen = rule.thenStages.some((stage) =>
        eventMatchesTypeAndCondition(event, stage.eventType.name, stage.condition),
      );
      if (relevantToObserve || relevantToThen) {
        trace.push({
          timestamp: new Date(0).toISOString(),
          ruleName,
          message: `Ignored event '${event.id}' because source '${event.source ?? "<missing>"}' is not a declared telemetry source`,
          eventIds: [event.id],
        });
      }
      return false;
    }
    return true;
  });

  const observeMatches = eligible.filter((event) =>
    eventMatchesTypeAndCondition(event, rule.observe!.eventType.name, rule.observe!.condition),
  );

  if (observeMatches.length === 0) {
    trace.push({
      timestamp: new Date(0).toISOString(),
      ruleName,
      message: "Observe stage did not match any events",
    });
    return {
      workspaceName,
      ruleName,
      matched: false,
      reason: "Observe stage did not match",
      matchedEventIds: [],
      confidence: 0,
      sources: 0,
      responses: [],
    };
  }

  let lastFailure: ChainAttempt | null = null;

  // Deterministic: try observe candidates earliest-first; within each, try then candidates earliest-first.
  for (const observeEvent of observeMatches) {
    trace.push({
      timestamp: new Date(eventTimeMs(observeEvent)).toISOString(),
      ruleName,
      message: `Trying observe candidate '${observeEvent.id}' (${observeEvent.type})`,
      eventIds: [observeEvent.id],
    });

    const attempt = searchThenStages(rule, observeEvent, eligible);

    if (attempt.matched) {
      trace.push(
        ...buildSuccessTrace(ruleName, rule, attempt.chain, attempt.confidence, attempt.sources),
      );
      const responses = executeResponses(workspace, rule, attempt.chain, executor, trace);
      return {
        workspaceName,
        ruleName,
        matched: true,
        reason: attempt.reason,
        matchedEventIds: attempt.chain.map((e) => e.id),
        confidence: attempt.confidence,
        sources: attempt.sources,
        responses,
      };
    }

    trace.push({
      timestamp: new Date(0).toISOString(),
      ruleName,
      message: `Observe candidate '${observeEvent.id}' failed: ${attempt.reason}`,
      eventIds: [observeEvent.id],
    });
    lastFailure = attempt;
  }

  const reason = lastFailure?.reason ?? "No observe candidate produced a complete chain";
  trace.push({
    timestamp: new Date(0).toISOString(),
    ruleName,
    message: `No observe candidate produced a complete chain; last failure: ${reason}`,
  });

  return {
    workspaceName,
    ruleName,
    matched: false,
    reason,
    matchedEventIds: lastFailure?.chain.map((e) => e.id) ?? [],
    confidence: lastFailure?.confidence ?? 0,
    sources: lastFailure?.sources ?? 0,
    responses: [],
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
    ordered = orderEvents(events).map((entry) => entry.event);
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }

  for (const workspace of program.workspaces) {
    const allowedSources = collectTelemetrySources(workspace);
    for (const member of workspace.members) {
      if (member.kind === "RuleDeclaration") {
        ruleResults.push(evaluateRule(workspace, member, ordered, allowedSources, executor, trace));
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
