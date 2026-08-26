import {
  PRODUCT_NAME,
  type ProgramNode,
  type RequireClauseNode,
  type RollbackStatementNode,
  type RuleDeclarationNode,
} from "@bitpall/ast";
import type {
  InterpretResult,
  JsonObject,
  MockSecurityEvent,
  RequirementEvaluation,
  RuleMatchResult,
} from "@bitpall/interpreter";
import type { ActionResult, ActionStatus, ResponseActionType } from "@bitpall/runtime";
import { escapeInline, escapeTableCell, flattenProperties } from "./markdown-escape.js";

export interface MarkdownExportOptions {
  readonly program: ProgramNode;
  readonly result: InterpretResult;
  readonly events?: readonly MockSecurityEvent[];
  readonly scenarioName?: string;
  /** When set, export this rule; otherwise prefer the first match, else the first rule result. */
  readonly ruleName?: string;
}

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

function actionLabel(type: ResponseActionType, target?: string): string {
  const base = ACTION_LABELS[type] ?? type;
  return target ? `${base} (${target})` : base;
}

function findRule(
  program: ProgramNode,
  workspaceName: string,
  ruleName: string,
): RuleDeclarationNode | null {
  for (const workspace of program.workspaces) {
    if (workspace.name.name !== workspaceName) continue;
    for (const member of workspace.members) {
      if (member.kind === "RuleDeclaration" && member.name.name === ruleName) {
        return member;
      }
    }
  }
  return null;
}

function selectRuleResult(
  result: InterpretResult,
  ruleName: string | undefined,
): RuleMatchResult | null {
  if (result.ruleResults.length === 0) return null;
  if (ruleName) {
    return result.ruleResults.find((rule) => rule.ruleName === ruleName) ?? null;
  }
  return result.ruleResults.find((rule) => rule.matched) ?? result.ruleResults[0] ?? null;
}

function requirementText(clause: RequireClauseNode): string {
  if (clause.metric === "confidence") {
    return `Confidence must be ${clause.operator} \`${clause.value.value}\``;
  }
  return `Evidence must come from ${clause.operator} \`${clause.value.value}\` sources`;
}

function evaluationText(evaluation: RequirementEvaluation): string {
  if (evaluation.metric === "confidence") {
    return `confidence ${evaluation.actual} ${evaluation.operator} ${evaluation.expected}`;
  }
  return `sources ${evaluation.actual} ${evaluation.operator} ${evaluation.expected}`;
}

function rollbackStatementLabel(statement: RollbackStatementNode): string {
  switch (statement.kind) {
    case "ReconnectAction":
      return `Reconnect endpoint \`${statement.target.name}\``;
    case "ReenableAccountAction":
      return `Re-enable account \`${statement.target.name}\``;
  }
}

function approvalNames(rule: RuleDeclarationNode): string[] {
  if (!rule.respond) return [];
  return rule.respond.statements
    .filter((statement) => statement.kind === "ApprovalRequirement")
    .map((statement) => statement.actionName.name);
}

function maxWithin(rule: RuleDeclarationNode): string | null {
  if (rule.thenStages.length === 0) return null;
  let maxMs = -1;
  let raw: string | null = null;
  for (const stage of rule.thenStages) {
    if (stage.within.milliseconds > maxMs) {
      maxMs = stage.within.milliseconds;
      raw = stage.within.raw;
    }
  }
  return raw;
}

function eventById(
  events: readonly MockSecurityEvent[] | undefined,
  id: string,
): MockSecurityEvent | undefined {
  return events?.find((event) => event.id === id);
}

function renderEventDetails(event: MockSecurityEvent): string[] {
  const lines: string[] = [];
  lines.push(`- Source: \`${escapeInline(event.source ?? "<missing>")}\``);
  lines.push(`- Timestamp: \`${escapeInline(String(event.timestamp))}\``);
  if (typeof event.confidence === "number") {
    lines.push(`- Confidence: \`${event.confidence}\``);
  }
  const flat = flattenProperties(event.properties as JsonObject);
  for (const row of flat) {
    lines.push(`- ${escapeInline(row.key)}: \`${escapeInline(row.value)}\``);
  }
  return lines;
}

function renderResponseRows(actions: readonly ActionResult[]): string[] {
  if (actions.length === 0) {
    return ["_No response actions were planned._"];
  }
  const lines = ["| Action | Status | Approval Required |", "| --- | --- | --- |"];
  for (const action of actions) {
    const label = escapeTableCell(actionLabel(action.action.type, action.action.target));
    const status = escapeTableCell(STATUS_LABELS[action.status] ?? action.status);
    const approval =
      action.status === "pending_approval" || action.action.requiresApproval ? "Yes" : "No";
    lines.push(`| ${label} | ${status} | ${approval} |`);
  }
  return lines;
}

/**
 * Render a deterministic Markdown detection report from Bitpall program + interpret output.
 */
export function exportMarkdownReport(options: MarkdownExportOptions): string {
  const { program, result, events, scenarioName, ruleName } = options;

  if (!program || program.kind !== "Program") {
    throw new Error("exportMarkdownReport requires a valid Bitpall program.");
  }
  if (!result || !Array.isArray(result.ruleResults)) {
    throw new Error("exportMarkdownReport requires a valid interpret result.");
  }

  const ruleResult = selectRuleResult(result, ruleName);
  if (!ruleResult) {
    throw new Error("exportMarkdownReport: no rule results available to export.");
  }

  const rule = findRule(program, ruleResult.workspaceName, ruleResult.ruleName);
  if (!rule) {
    throw new Error(
      `exportMarkdownReport: rule '${ruleResult.ruleName}' not found in workspace '${ruleResult.workspaceName}'.`,
    );
  }

  const sections: string[] = [];
  sections.push(`# ${PRODUCT_NAME} Detection Report`);
  sections.push("");

  sections.push("## Summary");
  sections.push("");
  sections.push(`- **Rule:** \`${escapeInline(ruleResult.ruleName)}\``);
  sections.push(`- **Workspace:** \`${escapeInline(ruleResult.workspaceName)}\``);
  if (scenarioName) {
    sections.push(`- **Scenario:** ${escapeInline(scenarioName)}`);
  }
  sections.push(`- **Status:** ${ruleResult.matched ? "Matched" : "No match"}`);
  sections.push(`- **Confidence:** \`${ruleResult.confidence}\``);
  sections.push(`- **Sources:** \`${ruleResult.sources}\``);
  sections.push(`- **Event chain size:** \`${ruleResult.matchedEventIds.length}\``);
  sections.push("");

  sections.push("## Rule");
  sections.push("");
  sections.push(`- **Name:** \`${escapeInline(ruleResult.ruleName)}\``);
  sections.push(`- **Workspace:** \`${escapeInline(ruleResult.workspaceName)}\``);
  sections.push("");

  sections.push("## Detection Logic");
  sections.push("");
  if (rule.observe) {
    sections.push(`1. Observe \`${escapeInline(rule.observe.eventType.name)}\``);
  }
  rule.thenStages.forEach((stage, index) => {
    sections.push(
      `${index + 2}. Then \`${escapeInline(stage.eventType.name)}\` within \`${escapeInline(stage.within.raw)}\``,
    );
  });
  const within = maxWithin(rule);
  if (within) {
    sections.push("");
    sections.push(`Maximum timing window among then-stages: \`${escapeInline(within)}\``);
  }
  sections.push("");

  if (rule.requires.length > 0) {
    sections.push("## Requirements");
    sections.push("");
    for (const clause of rule.requires) {
      sections.push(`- ${requirementText(clause)}`);
    }
    sections.push("");
  }

  sections.push("## Detection Result");
  sections.push("");
  sections.push(`**Status:** ${ruleResult.matched ? "Matched" : "No match"}`);
  sections.push("");
  sections.push(`**Confidence:** \`${ruleResult.confidence}\``);
  sections.push("");
  sections.push(`**Sources:** \`${ruleResult.sources}\``);
  sections.push("");
  sections.push(`**Reason:** ${escapeInline(ruleResult.reason)}`);
  sections.push("");

  if (ruleResult.requirementEvaluations.length > 0) {
    sections.push("### Requirement evaluations");
    sections.push("");
    for (const evaluation of ruleResult.requirementEvaluations) {
      const mark = evaluation.passed ? "pass" : "fail";
      sections.push(`- [${mark}] \`${escapeInline(evaluationText(evaluation))}\``);
    }
    sections.push("");
  }

  if (ruleResult.stageExplanations.length > 0) {
    sections.push("### Stage evaluations");
    sections.push("");
    for (const stage of ruleResult.stageExplanations) {
      const mark = stage.matched ? "matched" : "not matched";
      const kind = stage.stageKind === "observe" ? "Observe" : "Then";
      const withinNote = stage.within ? ` within \`${escapeInline(stage.within)}\`` : "";
      sections.push(
        `- [${mark}] ${kind} \`${escapeInline(stage.eventType)}\` ← \`${escapeInline(stage.eventId)}\`${withinNote}`,
      );
      for (const condition of stage.conditions) {
        const cMark = condition.passed ? "pass" : "fail";
        sections.push(
          `  - [${cMark}] \`${escapeInline(condition.field)}\` ${escapeInline(String(JSON.stringify(condition.actual)))} ${escapeInline(condition.operator)} ${escapeInline(String(JSON.stringify(condition.expected)))}`,
        );
      }
    }
    sections.push("");
  }

  if (ruleResult.matchedEventIds.length > 0) {
    sections.push(ruleResult.matched ? "## Matched Event Chain" : "## Partial Event Chain");
    sections.push("");
    ruleResult.matchedEventIds.forEach((eventId, index) => {
      const event = eventById(events, eventId);
      const type = event?.type ?? "unknown";
      sections.push(`### Event ${index + 1} — \`${escapeInline(type)}\``);
      sections.push("");
      sections.push(`- Id: \`${escapeInline(eventId)}\``);
      if (event) {
        sections.push(...renderEventDetails(event));
      }
      sections.push("");
    });
  } else if (!ruleResult.matched) {
    sections.push("## Matched Event Chain");
    sections.push("");
    sections.push("The supplied events did not produce a matched event chain.");
    sections.push("");
  }

  sections.push("## Response Plan");
  sections.push("");
  if (!ruleResult.matched) {
    sections.push("No response actions were simulated because the detection rule did not match.");
    sections.push("");
  } else {
    const responseActions = ruleResult.responses.filter(
      (action) => action.status !== "recorded_rollback",
    );
    sections.push(...renderResponseRows(responseActions));
    sections.push("");
    sections.push("_All response actions are simulation-only. No external systems were modified._");
    sections.push("");
  }

  const approvals = approvalNames(rule);
  const pending = result.pendingApprovals.filter(
    (action) => action.action.ruleName === ruleResult.ruleName,
  );
  if (approvals.length > 0 || pending.length > 0) {
    sections.push("## Safety / Approval Requirements");
    sections.push("");
    if (approvals.length > 0) {
      sections.push("The following actions require approval before execution:");
      sections.push("");
      for (const name of approvals) {
        sections.push(`- \`${escapeInline(name)}\``);
      }
      sections.push("");
    }
    if (pending.length > 0) {
      sections.push("Pending approval from this simulation:");
      sections.push("");
      for (const action of pending) {
        sections.push(
          `- ${escapeInline(actionLabel(action.action.type, action.action.target))} — ${STATUS_LABELS[action.status]}`,
        );
      }
      sections.push("");
    }
  }

  const rollbackFromAst = rule.rollback?.statements ?? [];
  const rollbackFromRuntime = result.rollbackActions.filter(
    (action) => action.action.ruleName === ruleResult.ruleName,
  );
  if (rollbackFromAst.length > 0 || rollbackFromRuntime.length > 0) {
    sections.push("## Rollback Plan");
    sections.push("");
    if (rollbackFromAst.length > 0) {
      rollbackFromAst.forEach((statement, index) => {
        sections.push(`${index + 1}. ${rollbackStatementLabel(statement)}`);
      });
      sections.push("");
    }
    if (rollbackFromRuntime.length > 0) {
      sections.push("Recorded rollback results (simulation only):");
      sections.push("");
      for (const action of rollbackFromRuntime) {
        sections.push(
          `- ${escapeInline(actionLabel(action.action.type, action.action.target))} — ${STATUS_LABELS[action.status]}`,
        );
      }
      sections.push("");
    }
  }

  sections.push("---");
  sections.push("");
  sections.push(
    `Generated by ${PRODUCT_NAME}. Response execution is simulated; this report does not describe live infrastructure changes.`,
  );
  sections.push("");

  return sections.join("\n");
}
