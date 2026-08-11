import type { IdentifierNode, ProgramNode, SourceRange } from "@aegisscript/ast";

export interface SymbolEntry {
  readonly name: string;
  readonly kind: "workspace" | "asset" | "telemetry" | "rule" | "test";
  readonly range: SourceRange;
}

export interface WorkspaceSymbols {
  readonly name: string;
  readonly nameRange: SourceRange;
  readonly assets: Map<string, SymbolEntry>;
  readonly telemetry: Map<string, SymbolEntry>;
  readonly rules: Map<string, SymbolEntry>;
  readonly tests: Map<string, SymbolEntry>;
  /** Unified declaration namespace across assets, telemetry, rules, and tests. */
  readonly declarations: Map<string, SymbolEntry>;
}

export interface SymbolTable {
  readonly workspaces: Map<string, WorkspaceSymbols>;
}

export interface DuplicateDeclaration {
  readonly existing: SymbolEntry;
  readonly duplicate: IdentifierNode;
  readonly duplicateKind: SymbolEntry["kind"];
  readonly scope: string;
}

export function buildSymbolTable(program: ProgramNode): {
  table: SymbolTable;
  duplicates: DuplicateDeclaration[];
} {
  const workspaces = new Map<string, WorkspaceSymbols>();
  const duplicates: DuplicateDeclaration[] = [];

  for (const workspace of program.workspaces) {
    const existingWs = workspaces.get(workspace.name.name);
    if (existingWs) {
      duplicates.push({
        existing: {
          name: existingWs.name,
          kind: "workspace",
          range: existingWs.nameRange,
        },
        duplicate: workspace.name,
        duplicateKind: "workspace",
        scope: "global",
      });
      continue;
    }

    const assets = new Map<string, SymbolEntry>();
    const telemetry = new Map<string, SymbolEntry>();
    const rules = new Map<string, SymbolEntry>();
    const tests = new Map<string, SymbolEntry>();
    const declarations = new Map<string, SymbolEntry>();

    const register = (
      kind: SymbolEntry["kind"],
      nameNode: IdentifierNode,
      specialized: Map<string, SymbolEntry>,
    ): void => {
      const entry: SymbolEntry = {
        name: nameNode.name,
        kind,
        range: nameNode.range,
      };
      const prev = declarations.get(nameNode.name);
      if (prev) {
        duplicates.push({
          existing: prev,
          duplicate: nameNode,
          duplicateKind: kind,
          scope: workspace.name.name,
        });
        return;
      }
      declarations.set(nameNode.name, entry);
      specialized.set(nameNode.name, entry);
    };

    for (const member of workspace.members) {
      if (member.kind === "AssetDeclaration") {
        register("asset", member.name, assets);
      } else if (member.kind === "TelemetryDeclaration") {
        register("telemetry", member.name, telemetry);
      } else if (member.kind === "RuleDeclaration") {
        register("rule", member.name, rules);
      } else if (member.kind === "TestDeclaration") {
        register("test", member.name, tests);
      }
    }

    workspaces.set(workspace.name.name, {
      name: workspace.name.name,
      nameRange: workspace.name.range,
      assets,
      telemetry,
      rules,
      tests,
      declarations,
    });
  }

  return { table: { workspaces }, duplicates };
}
