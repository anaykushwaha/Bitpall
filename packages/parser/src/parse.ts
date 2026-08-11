import {
  createDiagnostic,
  EMPTY_RANGE,
  type AssetDeclarationNode,
  type ComparisonOperator,
  type Diagnostic,
  type DurationLiteralNode,
  type DurationUnit,
  type ExpectRuleMatchNode,
  type ExpressionNode,
  type IdentifierNode,
  type LiteralNode,
  type NumberLiteralNode,
  type ObserveStageNode,
  type ProgramNode,
  type PropertyAssignmentNode,
  type PropertyPathNode,
  type RequireClauseNode,
  type RequireMetric,
  type RespondBlockNode,
  type ResponseStatementNode,
  type RollbackBlockNode,
  type RollbackStatementNode,
  type RuleDeclarationNode,
  type SourceFile,
  type TelemetryDeclarationNode,
  type TestDeclarationNode,
  type ThenStageNode,
  type WorkspaceDeclarationNode,
  type WorkspaceMemberNode,
} from "@aegisscript/ast";
import { lex, type Token } from "@aegisscript/lexer";

export interface ParseResult {
  readonly program: ProgramNode | null;
  readonly diagnostics: Diagnostic[];
}

const COMPARISON_OPS = new Set(["==", "!=", ">", ">=", "<", "<="]);

function durationMilliseconds(value: number, unit: DurationUnit): number {
  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60_000;
    case "h":
      return value * 3_600_000;
  }
}

class Parser {
  private readonly tokens: Token[];
  private readonly fileName: string;
  private readonly diagnostics: Diagnostic[] = [];
  private index = 0;
  /** Guard against infinite recovery loops. */
  private recoverySteps = 0;
  private readonly maxRecoverySteps: number;

  constructor(source: SourceFile, tokens: Token[], lexerDiagnostics: Diagnostic[]) {
    this.tokens = tokens;
    this.fileName = source.fileName;
    this.diagnostics.push(...lexerDiagnostics);
    this.maxRecoverySteps = Math.max(64, tokens.length * 2);
  }

  parse(): ParseResult {
    const workspaces: WorkspaceDeclarationNode[] = [];
    while (!this.isAtEnd()) {
      if (this.checkKeyword("workspace")) {
        const ws = this.parseWorkspace();
        if (ws) {
          workspaces.push(ws);
        }
      } else {
        this.error(this.peek(), "AEGIS2001", `Unexpected token '${this.peek().lexeme}'`);
        if (!this.synchronizeTo(["workspace"])) {
          break;
        }
      }
    }

    const program: ProgramNode = {
      kind: "Program",
      range: workspaces[0]
        ? {
            start: workspaces[0].range.start,
            end: workspaces[workspaces.length - 1]!.range.end,
          }
        : EMPTY_RANGE,
      workspaces,
    };

    const hasErrors = this.diagnostics.some((d) => d.severity === "error");
    return {
      program: hasErrors && workspaces.length === 0 ? null : program,
      diagnostics: this.diagnostics,
    };
  }

  private parseWorkspace(): WorkspaceDeclarationNode | null {
    const start = this.peek().range.start;
    this.expectKeyword("workspace");
    const name = this.parseIdentifier();
    this.expectPunctuation("{");
    const members: WorkspaceMemberNode[] = [];

    while (!this.isAtEnd() && !this.checkPunctuation("}")) {
      const before = this.index;
      if (this.checkKeyword("asset")) {
        const asset = this.parseAsset();
        if (asset) members.push(asset);
      } else if (this.checkKeyword("telemetry")) {
        const telemetry = this.parseTelemetry();
        if (telemetry) members.push(telemetry);
      } else if (this.checkKeyword("rule")) {
        const rule = this.parseRule();
        if (rule) members.push(rule);
      } else if (this.checkKeyword("test")) {
        const test = this.parseTest();
        if (test) members.push(test);
      } else {
        this.error(
          this.peek(),
          "AEGIS2001",
          `Unexpected token '${this.peek().lexeme}' in workspace body`,
        );
        this.synchronizeInBlock();
      }
      if (this.index === before) {
        this.advance();
      }
    }

    const endTok = this.expectPunctuation("}");
    if (!name) {
      return null;
    }
    return {
      kind: "WorkspaceDeclaration",
      range: { start, end: endTok.range.end },
      name,
      members,
    };
  }

  private parseAsset(): AssetDeclarationNode | null {
    const start = this.peek().range.start;
    this.expectKeyword("asset");
    const assetKind = this.parseIdentifier();
    const name = this.parseIdentifier();
    this.expectPunctuation("{");
    const properties = this.parsePropertyAssignments();
    const endTok = this.expectPunctuation("}");
    if (!assetKind || !name) return null;
    return {
      kind: "AssetDeclaration",
      range: { start, end: endTok.range.end },
      assetKind,
      name,
      properties,
    };
  }

  private parseTelemetry(): TelemetryDeclarationNode | null {
    const start = this.peek().range.start;
    this.expectKeyword("telemetry");
    const name = this.parseIdentifier();
    this.expectPunctuation("{");
    const properties = this.parsePropertyAssignments();
    const endTok = this.expectPunctuation("}");
    if (!name) return null;
    return {
      kind: "TelemetryDeclaration",
      range: { start, end: endTok.range.end },
      name,
      properties,
    };
  }

  private parsePropertyAssignments(): PropertyAssignmentNode[] {
    const properties: PropertyAssignmentNode[] = [];
    while (!this.isAtEnd() && !this.checkPunctuation("}")) {
      const before = this.index;
      const name = this.parseIdentifier();
      this.expectPunctuation("=");
      const value = this.parseLiteral();
      this.expectSemicolon();
      if (name && value) {
        properties.push({
          kind: "PropertyAssignment",
          range: { start: name.range.start, end: value.range.end },
          name,
          value,
        });
      }
      if (this.index === before) {
        this.advance();
      }
    }
    return properties;
  }

  private parseRule(): RuleDeclarationNode | null {
    const start = this.peek().range.start;
    this.expectKeyword("rule");
    const name = this.parseIdentifier();
    this.expectPunctuation("{");

    let observe: ObserveStageNode | null = null;
    const thenStages: ThenStageNode[] = [];
    const requires: RequireClauseNode[] = [];
    let respond: RespondBlockNode | null = null;
    let rollback: RollbackBlockNode | null = null;

    while (!this.isAtEnd() && !this.checkPunctuation("}")) {
      const before = this.index;
      if (this.checkKeyword("observe")) {
        const stage = this.parseObserveStage();
        if (stage) {
          if (observe) {
            this.diagnostics.push(
              createDiagnostic({
                code: "AEGIS3011",
                severity: "error",
                message: `Rule '${name?.name ?? "<unknown>"}' already has an observe stage`,
                fileName: this.fileName,
                range: stage.range,
                suggestion: "Keep only one observe stage per rule.",
                related: [
                  {
                    fileName: this.fileName,
                    range: observe.range,
                    message: "Previous observe stage",
                  },
                ],
              }),
            );
          } else {
            observe = stage;
          }
        }
      } else if (this.checkKeyword("then")) {
        const stage = this.parseThenStage();
        if (stage) thenStages.push(stage);
      } else if (this.checkKeyword("require")) {
        const req = this.parseRequireClause();
        if (req) requires.push(req);
      } else if (this.checkKeyword("respond")) {
        const block = this.parseRespondBlock();
        if (block) {
          if (respond) {
            this.diagnostics.push(
              createDiagnostic({
                code: "AEGIS3011",
                severity: "error",
                message: `Rule '${name?.name ?? "<unknown>"}' already has a respond block`,
                fileName: this.fileName,
                range: block.range,
                suggestion: "Keep only one respond block per rule.",
                related: [
                  {
                    fileName: this.fileName,
                    range: respond.range,
                    message: "Previous respond block",
                  },
                ],
              }),
            );
          } else {
            respond = block;
          }
        }
      } else if (this.checkKeyword("rollback")) {
        const block = this.parseRollbackBlock();
        if (block) {
          if (rollback) {
            this.diagnostics.push(
              createDiagnostic({
                code: "AEGIS3011",
                severity: "error",
                message: `Rule '${name?.name ?? "<unknown>"}' already has a rollback block`,
                fileName: this.fileName,
                range: block.range,
                suggestion: "Keep only one rollback block per rule.",
                related: [
                  {
                    fileName: this.fileName,
                    range: rollback.range,
                    message: "Previous rollback block",
                  },
                ],
              }),
            );
          } else {
            rollback = block;
          }
        }
      } else {
        this.error(
          this.peek(),
          "AEGIS2001",
          `Unexpected token '${this.peek().lexeme}' in rule body`,
        );
        this.synchronizeInBlock();
      }
      if (this.index === before) {
        this.advance();
      }
    }

    const endTok = this.expectPunctuation("}");
    if (!name) return null;
    return {
      kind: "RuleDeclaration",
      range: { start, end: endTok.range.end },
      name,
      observe,
      thenStages,
      requires,
      respond,
      rollback,
    };
  }

  private parseObserveStage(): ObserveStageNode | null {
    const start = this.peek().range.start;
    this.expectKeyword("observe");
    const eventType = this.parseIdentifier();
    this.expectKeyword("where");
    const condition = this.parseExpression();
    const end = this.expectSemicolon();
    if (!eventType || !condition) return null;
    return {
      kind: "ObserveStage",
      range: { start, end: end.range.end },
      eventType,
      condition,
    };
  }

  private parseThenStage(): ThenStageNode | null {
    const start = this.peek().range.start;
    this.expectKeyword("then");
    const eventType = this.parseIdentifier();
    this.expectKeyword("where");
    const condition = this.parseExpression();
    this.expectKeyword("within");
    const within = this.parseDuration();
    const end = this.expectSemicolon();
    if (!eventType || !condition || !within) return null;
    return {
      kind: "ThenStage",
      range: { start, end: end.range.end },
      eventType,
      condition,
      within,
    };
  }

  private parseRequireClause(): RequireClauseNode | null {
    const start = this.peek().range.start;
    this.expectKeyword("require");
    let metric: RequireMetric | null = null;
    if (this.checkKeyword("confidence")) {
      this.advance();
      metric = "confidence";
    } else if (this.checkKeyword("sources")) {
      this.advance();
      metric = "sources";
    } else {
      this.error(this.peek(), "AEGIS2001", "Expected 'confidence' or 'sources' after require");
      this.synchronizeTo([";"]);
      if (this.checkPunctuation(";")) this.advance();
      return null;
    }
    const opTok = this.peek();
    if (opTok.kind !== "Operator" || !COMPARISON_OPS.has(opTok.lexeme)) {
      this.error(opTok, "AEGIS2001", "Expected comparison operator in require clause");
      this.synchronizeTo([";"]);
      if (this.checkPunctuation(";")) this.advance();
      return null;
    }
    this.advance();
    const value = this.parseNumberLiteral();
    const end = this.expectSemicolon();
    if (!value) return null;
    return {
      kind: "RequireClause",
      range: { start, end: end.range.end },
      metric,
      operator: opTok.lexeme as ComparisonOperator,
      value,
    };
  }

  private parseRespondBlock(): RespondBlockNode | null {
    const start = this.peek().range.start;
    this.expectKeyword("respond");
    this.expectPunctuation("{");
    const statements: ResponseStatementNode[] = [];
    while (!this.isAtEnd() && !this.checkPunctuation("}")) {
      const before = this.index;
      if (this.checkKeyword("isolate")) {
        const actionStart = this.peek().range.start;
        this.advance();
        this.expectKeyword("endpoint");
        const target = this.parseIdentifier();
        const end = this.expectSemicolon();
        if (target) {
          statements.push({
            kind: "IsolateAction",
            range: { start: actionStart, end: end.range.end },
            targetKind: "endpoint",
            target,
          });
        }
      } else if (this.checkKeyword("preserve")) {
        const actionStart = this.peek().range.start;
        this.advance();
        this.expectKeyword("evidence");
        const end = this.expectSemicolon();
        statements.push({
          kind: "PreserveEvidenceAction",
          range: { start: actionStart, end: end.range.end },
        });
      } else if (this.checkKeyword("revoke")) {
        const actionStart = this.peek().range.start;
        this.advance();
        this.expectKeyword("sessions");
        this.expectKeyword("user");
        const target = this.parseIdentifier();
        const end = this.expectSemicolon();
        if (target) {
          statements.push({
            kind: "RevokeSessionsAction",
            range: { start: actionStart, end: end.range.end },
            targetKind: "user",
            target,
          });
        }
      } else if (this.checkKeyword("disable")) {
        const actionStart = this.peek().range.start;
        this.advance();
        this.expectKeyword("account");
        const target = this.parseIdentifier();
        const end = this.expectSemicolon();
        if (target) {
          statements.push({
            kind: "DisableAccountAction",
            range: { start: actionStart, end: end.range.end },
            targetKind: "account",
            target,
          });
        }
      } else if (this.checkKeyword("approval")) {
        const actionStart = this.peek().range.start;
        this.advance();
        this.expectKeyword("required");
        this.expectKeyword("for");
        const actionName = this.parseIdentifier();
        const end = this.expectSemicolon();
        if (actionName) {
          statements.push({
            kind: "ApprovalRequirement",
            range: { start: actionStart, end: end.range.end },
            actionName,
          });
        }
      } else {
        this.error(
          this.peek(),
          "AEGIS2001",
          `Unsupported response statement '${this.peek().lexeme}'`,
        );
        this.synchronizeInBlock();
      }
      if (this.index === before) this.advance();
    }
    const endTok = this.expectPunctuation("}");
    return {
      kind: "RespondBlock",
      range: { start, end: endTok.range.end },
      statements,
    };
  }

  private parseRollbackBlock(): RollbackBlockNode | null {
    const start = this.peek().range.start;
    this.expectKeyword("rollback");
    this.expectPunctuation("{");
    const statements: RollbackStatementNode[] = [];
    while (!this.isAtEnd() && !this.checkPunctuation("}")) {
      const before = this.index;
      if (this.checkKeyword("reconnect")) {
        const actionStart = this.peek().range.start;
        this.advance();
        this.expectKeyword("endpoint");
        const target = this.parseIdentifier();
        const end = this.expectSemicolon();
        if (target) {
          statements.push({
            kind: "ReconnectAction",
            range: { start: actionStart, end: end.range.end },
            targetKind: "endpoint",
            target,
          });
        }
      } else if (this.checkKeyword("reenable")) {
        const actionStart = this.peek().range.start;
        this.advance();
        this.expectKeyword("account");
        const target = this.parseIdentifier();
        const end = this.expectSemicolon();
        if (target) {
          statements.push({
            kind: "ReenableAccountAction",
            range: { start: actionStart, end: end.range.end },
            targetKind: "account",
            target,
          });
        }
      } else {
        this.error(
          this.peek(),
          "AEGIS2001",
          `Unsupported rollback statement '${this.peek().lexeme}'`,
        );
        this.synchronizeInBlock();
      }
      if (this.index === before) this.advance();
    }
    const endTok = this.expectPunctuation("}");
    return {
      kind: "RollbackBlock",
      range: { start, end: endTok.range.end },
      statements,
    };
  }

  private parseTest(): TestDeclarationNode | null {
    const start = this.peek().range.start;
    this.expectKeyword("test");
    const name = this.parseIdentifier();
    this.expectPunctuation("{");
    const statements: ExpectRuleMatchNode[] = [];
    while (!this.isAtEnd() && !this.checkPunctuation("}")) {
      const before = this.index;
      if (this.checkKeyword("expect")) {
        const stmtStart = this.peek().range.start;
        this.advance();
        this.expectKeyword("rule");
        const ruleName = this.parseIdentifier();
        this.expectKeyword("to_match");
        const end = this.expectSemicolon();
        if (ruleName) {
          statements.push({
            kind: "ExpectRuleMatch",
            range: { start: stmtStart, end: end.range.end },
            ruleName,
          });
        }
      } else {
        this.error(
          this.peek(),
          "AEGIS2001",
          `Unexpected token '${this.peek().lexeme}' in test body`,
        );
        this.synchronizeInBlock();
      }
      if (this.index === before) this.advance();
    }
    const endTok = this.expectPunctuation("}");
    if (!name) return null;
    return {
      kind: "TestDeclaration",
      range: { start, end: endTok.range.end },
      name,
      statements,
    };
  }

  private parseExpression(): ExpressionNode | null {
    return this.parseOr();
  }

  private parseOr(): ExpressionNode | null {
    let left = this.parseAnd();
    while (this.checkKeyword("or")) {
      this.advance();
      const right = this.parseAnd();
      if (!left || !right) return left;
      left = {
        kind: "BinaryExpression",
        range: { start: left.range.start, end: right.range.end },
        operator: "or",
        left,
        right,
      };
    }
    return left;
  }

  private parseAnd(): ExpressionNode | null {
    let left = this.parseUnary();
    while (this.checkKeyword("and")) {
      this.advance();
      const right = this.parseUnary();
      if (!left || !right) return left;
      left = {
        kind: "BinaryExpression",
        range: { start: left.range.start, end: right.range.end },
        operator: "and",
        left,
        right,
      };
    }
    return left;
  }

  private parseUnary(): ExpressionNode | null {
    if (this.checkKeyword("not")) {
      const start = this.peek().range.start;
      this.advance();
      const operand = this.parseUnary();
      if (!operand) return null;
      return {
        kind: "UnaryExpression",
        range: { start, end: operand.range.end },
        operator: "not",
        operand,
      };
    }
    return this.parseComparison();
  }

  private parseComparison(): ExpressionNode | null {
    const left = this.parsePrimary();
    if (!left) return null;
    if (this.peek().kind === "Operator" && COMPARISON_OPS.has(this.peek().lexeme)) {
      const op = this.advance();
      const right = this.parsePrimary();
      if (!right) return left;
      if (
        (left.kind === "PropertyPath" || left.kind === "Identifier") &&
        (right.kind === "StringLiteral" ||
          right.kind === "NumberLiteral" ||
          right.kind === "BooleanLiteral" ||
          right.kind === "DurationLiteral" ||
          right.kind === "PropertyPath" ||
          right.kind === "Identifier")
      ) {
        return {
          kind: "ComparisonExpression",
          range: { start: left.range.start, end: right.range.end },
          left,
          operator: op.lexeme as ComparisonOperator,
          right,
        };
      }
      this.error(op, "AEGIS2001", "Invalid comparison operands");
      return left;
    }
    return left;
  }

  private parsePrimary(): ExpressionNode | null {
    if (this.checkPunctuation("(")) {
      this.advance();
      const expr = this.parseExpression();
      this.expectPunctuation(")");
      return expr;
    }
    if (
      this.peek().kind === "String" ||
      this.peek().kind === "Number" ||
      this.peek().kind === "Boolean" ||
      this.peek().kind === "Duration"
    ) {
      return this.parseLiteral();
    }
    if (this.peek().kind === "Identifier" || this.peek().kind === "Keyword") {
      // Property paths may start with identifiers; keywords like confidence appear in other contexts.
      if (this.peek().kind === "Keyword" && !this.isPathStartKeyword(this.peek().lexeme)) {
        this.error(
          this.peek(),
          "AEGIS2001",
          `Unexpected keyword '${this.peek().lexeme}' in expression`,
        );
        this.advance();
        return null;
      }
      return this.parsePropertyPathOrIdentifier();
    }
    this.error(this.peek(), "AEGIS2001", `Unexpected token '${this.peek().lexeme}' in expression`);
    this.advance();
    return null;
  }

  private isPathStartKeyword(lexeme: string): boolean {
    return (
      lexeme === "confidence" ||
      lexeme === "sources" ||
      lexeme === "endpoint" ||
      lexeme === "evidence" ||
      lexeme === "user" ||
      lexeme === "account" ||
      lexeme === "sessions"
    );
  }

  private parsePropertyPathOrIdentifier(): PropertyPathNode | IdentifierNode | null {
    const first = this.peek();
    if (first.kind !== "Identifier" && first.kind !== "Keyword") {
      this.error(first, "AEGIS2001", "Expected identifier");
      return null;
    }
    this.advance();
    const parts = [first.lexeme];
    const start = first.range.start;
    let end = first.range.end;
    while (this.checkPunctuation(".")) {
      this.advance();
      const part = this.peek();
      if (part.kind !== "Identifier" && part.kind !== "Keyword") {
        this.error(part, "AEGIS2001", "Expected property name after '.'");
        break;
      }
      this.advance();
      parts.push(part.lexeme);
      end = part.range.end;
    }
    if (parts.length === 1) {
      return {
        kind: "Identifier",
        range: { start, end },
        name: parts[0]!,
      };
    }
    return {
      kind: "PropertyPath",
      range: { start, end },
      parts,
    };
  }

  private parseLiteral(): LiteralNode | null {
    const tok = this.peek();
    if (tok.kind === "String") {
      this.advance();
      return { kind: "StringLiteral", range: tok.range, value: String(tok.value ?? "") };
    }
    if (tok.kind === "Boolean") {
      this.advance();
      return { kind: "BooleanLiteral", range: tok.range, value: Boolean(tok.value) };
    }
    if (tok.kind === "Number") {
      return this.parseNumberLiteral();
    }
    if (tok.kind === "Duration") {
      return this.parseDuration();
    }
    this.error(tok, "AEGIS2001", "Expected literal");
    this.advance();
    return null;
  }

  private parseNumberLiteral(): NumberLiteralNode | null {
    const tok = this.peek();
    if (tok.kind !== "Number") {
      this.error(tok, "AEGIS2001", "Expected number");
      return null;
    }
    this.advance();
    return {
      kind: "NumberLiteral",
      range: tok.range,
      value: Number(tok.value),
      raw: tok.lexeme,
    };
  }

  private parseDuration(): DurationLiteralNode | null {
    const tok = this.peek();
    if (tok.kind !== "Duration") {
      this.error(tok, "AEGIS2001", "Expected duration literal (e.g. 30s, 5m, 1h)");
      return null;
    }
    this.advance();
    const match = /^(\d+)([smh])$/.exec(tok.lexeme);
    if (!match) {
      this.error(tok, "AEGIS2001", `Invalid duration '${tok.lexeme}'`);
      return null;
    }
    const value = Number(match[1]);
    const unit = match[2] as DurationUnit;
    return {
      kind: "DurationLiteral",
      range: tok.range,
      value,
      unit,
      milliseconds: durationMilliseconds(value, unit),
      raw: tok.lexeme,
    };
  }

  private parseIdentifier(): IdentifierNode | null {
    const tok = this.peek();
    if (tok.kind !== "Identifier" && tok.kind !== "Keyword") {
      this.error(tok, "AEGIS2001", `Expected identifier, found '${tok.lexeme}'`);
      return null;
    }
    this.advance();
    return {
      kind: "Identifier",
      range: tok.range,
      name: tok.lexeme,
    };
  }

  private expectKeyword(keyword: string): Token {
    if (this.checkKeyword(keyword)) {
      return this.advance();
    }
    this.error(this.peek(), "AEGIS2001", `Expected '${keyword}', found '${this.peek().lexeme}'`);
    return this.peek();
  }

  private expectPunctuation(lexeme: string): Token {
    if (this.checkPunctuation(lexeme)) {
      return this.advance();
    }
    const code =
      lexeme === ";" ? "AEGIS2002" : lexeme === "{" || lexeme === "}" ? "AEGIS2003" : "AEGIS2001";
    const message =
      lexeme === ";"
        ? "Missing semicolon"
        : lexeme === "{"
          ? "Missing opening brace '{'"
          : lexeme === "}"
            ? "Missing closing brace '}'"
            : `Expected '${lexeme}', found '${this.peek().lexeme}'`;
    this.error(this.peek(), code, message);
    return this.peek();
  }

  private expectSemicolon(): Token {
    return this.expectPunctuation(";");
  }

  private checkKeyword(keyword: string): boolean {
    const tok = this.peek();
    return tok.kind === "Keyword" && tok.lexeme === keyword;
  }

  private checkPunctuation(lexeme: string): boolean {
    const tok = this.peek();
    return tok.kind === "Punctuation" && tok.lexeme === lexeme;
  }

  private peek(): Token {
    return this.tokens[this.index] ?? this.tokens[this.tokens.length - 1]!;
  }

  private advance(): Token {
    const current = this.peek();
    if (!this.isAtEnd()) {
      this.index += 1;
    }
    return current;
  }

  private isAtEnd(): boolean {
    return this.peek().kind === "Eof";
  }

  private error(
    token: Token,
    code: Diagnostic["code"],
    message: string,
    suggestion?: string,
  ): void {
    this.diagnostics.push(
      createDiagnostic({
        code,
        severity: "error",
        message,
        fileName: this.fileName,
        range: token.range,
        ...(suggestion ? { suggestion } : {}),
      }),
    );
  }

  private synchronizeTo(stopLexemes: string[]): boolean {
    if (this.recoverySteps >= this.maxRecoverySteps) {
      return false;
    }
    while (!this.isAtEnd()) {
      this.recoverySteps += 1;
      if (this.recoverySteps >= this.maxRecoverySteps) {
        this.error(this.peek(), "AEGIS2004", "Parser recovery limit exceeded");
        return false;
      }
      const tok = this.peek();
      if (
        stopLexemes.includes(tok.lexeme) ||
        (tok.kind === "Keyword" && stopLexemes.includes(tok.lexeme))
      ) {
        return true;
      }
      this.advance();
    }
    return false;
  }

  private synchronizeInBlock(): void {
    while (!this.isAtEnd()) {
      this.recoverySteps += 1;
      if (this.recoverySteps >= this.maxRecoverySteps) {
        this.error(this.peek(), "AEGIS2004", "Parser recovery limit exceeded");
        return;
      }
      const tok = this.peek();
      if (tok.kind === "Punctuation" && tok.lexeme === ";") {
        this.advance();
        return;
      }
      if (tok.kind === "Punctuation" && tok.lexeme === "}") {
        return;
      }
      if (
        tok.kind === "Keyword" &&
        [
          "asset",
          "telemetry",
          "rule",
          "test",
          "observe",
          "then",
          "require",
          "respond",
          "rollback",
          "workspace",
        ].includes(tok.lexeme)
      ) {
        return;
      }
      this.advance();
    }
  }
}

export function parse(source: SourceFile): ParseResult {
  const lexed = lex(source);
  const parser = new Parser(source, lexed.tokens, lexed.diagnostics);
  return parser.parse();
}

export function parseTokens(
  source: SourceFile,
  tokens: Token[],
  diagnostics: Diagnostic[] = [],
): ParseResult {
  const parser = new Parser(source, tokens, diagnostics);
  return parser.parse();
}
