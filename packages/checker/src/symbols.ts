import type { IdentifierNode, ProgramNode, SourceRange } from "@aegisscript/ast";

export interface SymbolEntry {
  readonly name: string;
  readonly kind: "workspace" | "asset" | "telemetry" | "rule" | "test";
  readonly range: SourceRange;
}

export interface WorkspaceSymbols {
  readonly name: string;
  readonly assets: Map<string, SymbolEntry>;
  readonly telemetry: Map<string, SymbolEntry>;
  readonly rules: Map<string, SymbolEntry>;
  readonly tests: Map<string, SymbolEntry>;
}

export interface SymbolTable {
  readonly workspaces: Map<string, WorkspaceSymbols>;
}

export function buildSymbolTable(program: ProgramNode): {
  table: SymbolTable;
  duplicates: Array<{ existing: SymbolEntry; duplicate: IdentifierNode; scope: string }>;
} {
  const workspaces = new Map<string, WorkspaceSymbols>();
  const duplicates: Array<{ existing: SymbolEntry; duplicate: IdentifierNode; scope: string }> = [];

  for (const workspace of program.workspaces) {
    const existingWs = workspaces.get(workspace.name.name);
    if (existingWs) {
      duplicates.push({
        existing: {
          name: existingWs.name,
          kind: "workspace",
          range: workspace.name.range,
        },
        duplicate: workspace.name,
        scope: "global",
      });
      continue;
    }

    const assets = new Map<string, SymbolEntry>();
    const telemetry = new Map<string, SymbolEntry>();
    const rules = new Map<string, SymbolEntry>();
    const tests = new Map<string, SymbolEntry>();

    for (const member of workspace.members) {
      if (member.kind === "AssetDeclaration") {
        const entry: SymbolEntry = {
          name: member.name.name,
          kind: "asset",
          range: member.name.range,
        };
        const prev = assets.get(member.name.name);
        if (prev) {
          duplicates.push({ existing: prev, duplicate: member.name, scope: workspace.name.name });
        } else {
          assets.set(member.name.name, entry);
        }
      } else if (member.kind === "TelemetryDeclaration") {
        const entry: SymbolEntry = {
          name: member.name.name,
          kind: "telemetry",
          range: member.name.range,
        };
        const prev = telemetry.get(member.name.name);
        if (prev) {
          duplicates.push({ existing: prev, duplicate: member.name, scope: workspace.name.name });
        } else {
          telemetry.set(member.name.name, entry);
        }
      } else if (member.kind === "RuleDeclaration") {
        const entry: SymbolEntry = {
          name: member.name.name,
          kind: "rule",
          range: member.name.range,
        };
        const prev = rules.get(member.name.name);
        if (prev) {
          duplicates.push({ existing: prev, duplicate: member.name, scope: workspace.name.name });
        } else {
          rules.set(member.name.name, entry);
        }
      } else if (member.kind === "TestDeclaration") {
        const entry: SymbolEntry = {
          name: member.name.name,
          kind: "test",
          range: member.name.range,
        };
        const prev = tests.get(member.name.name);
        if (prev) {
          duplicates.push({ existing: prev, duplicate: member.name, scope: workspace.name.name });
        } else {
          tests.set(member.name.name, entry);
        }
      }
    }

    workspaces.set(workspace.name.name, {
      name: workspace.name.name,
      assets,
      telemetry,
      rules,
      tests,
    });
  }

  return { table: { workspaces }, duplicates };
}
