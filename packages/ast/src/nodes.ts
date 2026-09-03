import type { SourceRange } from "./source.js";

export type AstNodeKind =
  | "Program"
  | "WorkspaceDeclaration"
  | "AssetDeclaration"
  | "TelemetryDeclaration"
  | "RuleDeclaration"
  | "TestDeclaration"
  | "PropertyAssignment"
  | "ObserveStage"
  | "ThenStage"
  | "RequireClause"
  | "RespondBlock"
  | "RollbackBlock"
  | "IsolateAction"
  | "PreserveEvidenceAction"
  | "RevokeSessionsAction"
  | "DisableAccountAction"
  | "ApprovalRequirement"
  | "ReconnectAction"
  | "ReenableAccountAction"
  | "ExpectRuleMatch"
  | "ExpectRuleConfidence"
  | "BinaryExpression"
  | "UnaryExpression"
  | "ComparisonExpression"
  | "Identifier"
  | "PropertyPath"
  | "StringLiteral"
  | "NumberLiteral"
  | "BooleanLiteral"
  | "DurationLiteral";

export interface AstNodeBase {
  readonly kind: AstNodeKind;
  readonly range: SourceRange;
}

export interface IdentifierNode extends AstNodeBase {
  readonly kind: "Identifier";
  readonly name: string;
}

export interface PropertyPathNode extends AstNodeBase {
  readonly kind: "PropertyPath";
  readonly parts: readonly string[];
}

export interface StringLiteralNode extends AstNodeBase {
  readonly kind: "StringLiteral";
  readonly value: string;
}

export interface NumberLiteralNode extends AstNodeBase {
  readonly kind: "NumberLiteral";
  readonly value: number;
  readonly raw: string;
}

export interface BooleanLiteralNode extends AstNodeBase {
  readonly kind: "BooleanLiteral";
  readonly value: boolean;
}

export type DurationUnit = "s" | "m" | "h";

export interface DurationLiteralNode extends AstNodeBase {
  readonly kind: "DurationLiteral";
  readonly value: number;
  readonly unit: DurationUnit;
  readonly milliseconds: number;
  readonly raw: string;
}

export type LiteralNode =
  StringLiteralNode | NumberLiteralNode | BooleanLiteralNode | DurationLiteralNode;

export type ComparisonOperator = "==" | "!=" | ">" | ">=" | "<" | "<=";
export type BooleanOperator = "and" | "or";

export interface ComparisonExpressionNode extends AstNodeBase {
  readonly kind: "ComparisonExpression";
  readonly left: PropertyPathNode | IdentifierNode;
  readonly operator: ComparisonOperator;
  readonly right: LiteralNode | PropertyPathNode | IdentifierNode;
}

export interface BinaryExpressionNode extends AstNodeBase {
  readonly kind: "BinaryExpression";
  readonly operator: BooleanOperator;
  readonly left: ExpressionNode;
  readonly right: ExpressionNode;
}

export interface UnaryExpressionNode extends AstNodeBase {
  readonly kind: "UnaryExpression";
  readonly operator: "not";
  readonly operand: ExpressionNode;
}

export type ExpressionNode =
  | ComparisonExpressionNode
  | BinaryExpressionNode
  | UnaryExpressionNode
  | PropertyPathNode
  | IdentifierNode
  | LiteralNode;

export interface PropertyAssignmentNode extends AstNodeBase {
  readonly kind: "PropertyAssignment";
  readonly name: IdentifierNode;
  readonly value: LiteralNode;
}

export interface ObserveStageNode extends AstNodeBase {
  readonly kind: "ObserveStage";
  readonly eventType: IdentifierNode;
  readonly condition: ExpressionNode;
}

export interface ThenStageNode extends AstNodeBase {
  readonly kind: "ThenStage";
  readonly eventType: IdentifierNode;
  readonly condition: ExpressionNode;
  readonly within: DurationLiteralNode;
}

export type RequireMetric = "confidence" | "sources";

export interface RequireClauseNode extends AstNodeBase {
  readonly kind: "RequireClause";
  readonly metric: RequireMetric;
  readonly operator: ComparisonOperator;
  readonly value: NumberLiteralNode;
}

export interface IsolateActionNode extends AstNodeBase {
  readonly kind: "IsolateAction";
  readonly targetKind: "endpoint";
  readonly target: IdentifierNode;
}

export interface PreserveEvidenceActionNode extends AstNodeBase {
  readonly kind: "PreserveEvidenceAction";
}

export interface RevokeSessionsActionNode extends AstNodeBase {
  readonly kind: "RevokeSessionsAction";
  readonly targetKind: "user";
  readonly target: IdentifierNode;
}

export interface DisableAccountActionNode extends AstNodeBase {
  readonly kind: "DisableAccountAction";
  readonly targetKind: "account";
  readonly target: IdentifierNode;
}

export interface ApprovalRequirementNode extends AstNodeBase {
  readonly kind: "ApprovalRequirement";
  readonly actionName: IdentifierNode;
}

export type ResponseStatementNode =
  | IsolateActionNode
  | PreserveEvidenceActionNode
  | RevokeSessionsActionNode
  | DisableAccountActionNode
  | ApprovalRequirementNode;

export interface RespondBlockNode extends AstNodeBase {
  readonly kind: "RespondBlock";
  readonly statements: readonly ResponseStatementNode[];
}

export interface ReconnectActionNode extends AstNodeBase {
  readonly kind: "ReconnectAction";
  readonly targetKind: "endpoint";
  readonly target: IdentifierNode;
}

export interface ReenableAccountActionNode extends AstNodeBase {
  readonly kind: "ReenableAccountAction";
  readonly targetKind: "account";
  readonly target: IdentifierNode;
}

export type RollbackStatementNode = ReconnectActionNode | ReenableAccountActionNode;

export interface RollbackBlockNode extends AstNodeBase {
  readonly kind: "RollbackBlock";
  readonly statements: readonly RollbackStatementNode[];
}

export interface RuleDeclarationNode extends AstNodeBase {
  readonly kind: "RuleDeclaration";
  readonly name: IdentifierNode;
  readonly observe: ObserveStageNode | null;
  readonly thenStages: readonly ThenStageNode[];
  readonly requires: readonly RequireClauseNode[];
  readonly respond: RespondBlockNode | null;
  readonly rollback: RollbackBlockNode | null;
}

export type RuleMatchExpectation = "match" | "not_match";

export interface ExpectRuleMatchNode extends AstNodeBase {
  readonly kind: "ExpectRuleMatch";
  readonly ruleName: IdentifierNode;
  readonly expectation: RuleMatchExpectation;
}

export interface ExpectRuleConfidenceNode extends AstNodeBase {
  readonly kind: "ExpectRuleConfidence";
  readonly ruleName: IdentifierNode;
  readonly operator: ComparisonOperator;
  readonly value: NumberLiteralNode;
}

export type TestStatementNode = ExpectRuleMatchNode | ExpectRuleConfidenceNode;

export interface TestDeclarationNode extends AstNodeBase {
  readonly kind: "TestDeclaration";
  readonly name: IdentifierNode;
  readonly statements: readonly TestStatementNode[];
}

export interface AssetDeclarationNode extends AstNodeBase {
  readonly kind: "AssetDeclaration";
  readonly assetKind: IdentifierNode;
  readonly name: IdentifierNode;
  readonly properties: readonly PropertyAssignmentNode[];
}

export interface TelemetryDeclarationNode extends AstNodeBase {
  readonly kind: "TelemetryDeclaration";
  readonly name: IdentifierNode;
  readonly properties: readonly PropertyAssignmentNode[];
}

export type WorkspaceMemberNode =
  AssetDeclarationNode | TelemetryDeclarationNode | RuleDeclarationNode | TestDeclarationNode;

export interface WorkspaceDeclarationNode extends AstNodeBase {
  readonly kind: "WorkspaceDeclaration";
  readonly name: IdentifierNode;
  readonly members: readonly WorkspaceMemberNode[];
}

export interface ProgramNode extends AstNodeBase {
  readonly kind: "Program";
  readonly workspaces: readonly WorkspaceDeclarationNode[];
}

export type AstNode =
  | ProgramNode
  | WorkspaceDeclarationNode
  | WorkspaceMemberNode
  | PropertyAssignmentNode
  | ObserveStageNode
  | ThenStageNode
  | RequireClauseNode
  | RespondBlockNode
  | RollbackBlockNode
  | ResponseStatementNode
  | RollbackStatementNode
  | TestStatementNode
  | ExpressionNode;
