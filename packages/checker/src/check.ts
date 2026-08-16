import {
  createDiagnostic,
  type Diagnostic,
  type ProgramNode,
  type PropertyAssignmentNode,
  type RuleDeclarationNode,
  type SourceFile,
  type StringLiteralNode,
  type TelemetryDeclarationNode,
} from "@bitpall/ast";
import { buildSymbolTable } from "./symbols.js";

export interface CheckResult {
  readonly diagnostics: Diagnostic[];
  readonly program: ProgramNode;
}

const SUPPORTED_RESPONSE_ACTIONS = new Set([
  "isolate_endpoint",
  "preserve_evidence",
  "terminate_process",
  "revoke_sessions",
  "disable_account",
]);

export function check(program: ProgramNode, source: SourceFile): CheckResult {
  const diagnostics: Diagnostic[] = [];
  const { table, duplicates } = buildSymbolTable(program);

  for (const dup of duplicates) {
    const sameKind = dup.existing.kind === dup.duplicateKind;
    const message = sameKind
      ? `Duplicate ${dup.duplicateKind} declaration '${dup.duplicate.name}' in scope '${dup.scope}'`
      : `Duplicate declaration '${dup.duplicate.name}' in scope '${dup.scope}' (${dup.duplicateKind} conflicts with existing ${dup.existing.kind})`;
    diagnostics.push(
      createDiagnostic({
        code: "AEGIS3001",
        severity: "error",
        message,
        fileName: source.fileName,
        range: dup.duplicate.range,
        related: [
          {
            fileName: source.fileName,
            range: dup.existing.range,
            message: `Previously declared as ${dup.existing.kind} here`,
          },
        ],
      }),
    );
  }

  for (const workspace of program.workspaces) {
    const symbols = table.workspaces.get(workspace.name.name);
    if (!symbols) continue;

    if (symbols.telemetry.size === 0) {
      diagnostics.push(
        createDiagnostic({
          code: "AEGIS3010",
          severity: "error",
          message: `Workspace '${workspace.name.name}' must declare at least one telemetry source`,
          fileName: source.fileName,
          range: workspace.name.range,
        }),
      );
    }

    const telemetrySources = new Map<string, { range: PropertyAssignmentNode["range"] }>();

    for (const member of workspace.members) {
      if (member.kind === "TelemetryDeclaration") {
        checkTelemetry(member, source, diagnostics, telemetrySources);
      } else if (member.kind === "RuleDeclaration") {
        checkRule(member, source, diagnostics, symbols.assets);
      } else if (member.kind === "TestDeclaration") {
        for (const statement of member.statements) {
          if (!symbols.rules.has(statement.ruleName.name)) {
            diagnostics.push(
              createDiagnostic({
                code: "AEGIS3003",
                severity: "error",
                message: `Unknown rule '${statement.ruleName.name}'`,
                fileName: source.fileName,
                range: statement.ruleName.range,
              }),
            );
          }
        }
      }
    }
  }

  return { diagnostics, program };
}

function checkTelemetry(
  telemetry: TelemetryDeclarationNode,
  source: SourceFile,
  diagnostics: Diagnostic[],
  telemetrySources: Map<string, { range: PropertyAssignmentNode["range"] }>,
): void {
  const sourceProp = telemetry.properties.find((p) => p.name.name === "source");
  if (!sourceProp) {
    diagnostics.push(
      createDiagnostic({
        code: "AEGIS3013",
        severity: "error",
        message: `Telemetry '${telemetry.name.name}' must declare a source property`,
        fileName: source.fileName,
        range: telemetry.name.range,
      }),
    );
    return;
  }

  if (sourceProp.value.kind !== "StringLiteral") {
    diagnostics.push(
      createDiagnostic({
        code: "AEGIS3013",
        severity: "error",
        message: `Telemetry '${telemetry.name.name}' source must be a string literal`,
        fileName: source.fileName,
        range: sourceProp.value.range,
      }),
    );
    return;
  }

  const sourceValue = (sourceProp.value as StringLiteralNode).value;
  if (sourceValue.length === 0) {
    diagnostics.push(
      createDiagnostic({
        code: "AEGIS3013",
        severity: "error",
        message: `Telemetry '${telemetry.name.name}' source must not be empty`,
        fileName: source.fileName,
        range: sourceProp.value.range,
      }),
    );
    return;
  }

  const existing = telemetrySources.get(sourceValue);
  if (existing) {
    diagnostics.push(
      createDiagnostic({
        code: "AEGIS3014",
        severity: "error",
        message: `Duplicate telemetry source string '${sourceValue}'`,
        fileName: source.fileName,
        range: sourceProp.value.range,
        related: [
          {
            fileName: source.fileName,
            range: existing.range,
            message: "Previously declared here",
          },
        ],
      }),
    );
  } else {
    telemetrySources.set(sourceValue, { range: sourceProp.value.range });
  }
}

function checkRule(
  rule: RuleDeclarationNode,
  source: SourceFile,
  diagnostics: Diagnostic[],
  assets: Map<string, { name: string }>,
): void {
  if (rule.thenStages.length > 0 && !rule.observe) {
    diagnostics.push(
      createDiagnostic({
        code: "AEGIS3007",
        severity: "error",
        message: `Rule '${rule.name.name}' has a then stage without an observe stage`,
        fileName: source.fileName,
        range: rule.thenStages[0]!.range,
      }),
    );
  }

  if (rule.rollback && !rule.respond) {
    diagnostics.push(
      createDiagnostic({
        code: "AEGIS3008",
        severity: "error",
        message: `Rule '${rule.name.name}' has a rollback block without a response block`,
        fileName: source.fileName,
        range: rule.rollback.range,
      }),
    );
  }

  for (const stage of rule.thenStages) {
    if (stage.within.value <= 0) {
      diagnostics.push(
        createDiagnostic({
          code: "AEGIS3005",
          severity: "error",
          message: `Invalid duration '${stage.within.raw}'; value must be positive`,
          fileName: source.fileName,
          range: stage.within.range,
        }),
      );
    }
  }

  for (const req of rule.requires) {
    if (req.metric === "confidence") {
      if (req.value.value < 0 || req.value.value > 1) {
        diagnostics.push(
          createDiagnostic({
            code: "AEGIS3004",
            severity: "error",
            message: `Confidence value ${req.value.value} is outside allowed range 0.0 to 1.0`,
            fileName: source.fileName,
            range: req.value.range,
          }),
        );
      }
    }
    if (req.metric === "sources") {
      if (!Number.isInteger(req.value.value)) {
        diagnostics.push(
          createDiagnostic({
            code: "AEGIS3012",
            severity: "error",
            message: `Sources requirement ${req.value.raw} must be an integer`,
            fileName: source.fileName,
            range: req.value.range,
          }),
        );
      } else if (req.value.value < 0) {
        diagnostics.push(
          createDiagnostic({
            code: "AEGIS3012",
            severity: "error",
            message: `Sources requirement ${req.value.value} must be non-negative`,
            fileName: source.fileName,
            range: req.value.range,
          }),
        );
      }
    }
  }

  if (rule.respond) {
    for (const statement of rule.respond.statements) {
      if (
        statement.kind === "IsolateAction" ||
        statement.kind === "RevokeSessionsAction" ||
        statement.kind === "DisableAccountAction"
      ) {
        if (!assets.has(statement.target.name)) {
          diagnostics.push(
            createDiagnostic({
              code: "AEGIS3002",
              severity: "error",
              message: `Unknown asset '${statement.target.name}'`,
              fileName: source.fileName,
              range: statement.target.range,
            }),
          );
        }
      } else if (statement.kind === "ApprovalRequirement") {
        const actionKey = statement.actionName.name;
        if (!SUPPORTED_RESPONSE_ACTIONS.has(actionKey)) {
          diagnostics.push(
            createDiagnostic({
              code: "AEGIS4001",
              severity: "error",
              message: `Unsupported response action '${actionKey}'`,
              fileName: source.fileName,
              range: statement.actionName.range,
            }),
          );
        }
      }
    }
  }

  if (rule.rollback) {
    for (const statement of rule.rollback.statements) {
      if (
        (statement.kind === "ReconnectAction" || statement.kind === "ReenableAccountAction") &&
        !assets.has(statement.target.name)
      ) {
        diagnostics.push(
          createDiagnostic({
            code: "AEGIS3002",
            severity: "error",
            message: `Unknown asset '${statement.target.name}'`,
            fileName: source.fileName,
            range: statement.target.range,
          }),
        );
      }
    }
  }
}
