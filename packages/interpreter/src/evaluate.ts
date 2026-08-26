import type {
  ComparisonExpressionNode,
  ComparisonOperator,
  ExpressionNode,
  LiteralNode,
} from "@bitpall/ast";
import { getProperty, type JsonObject, type JsonValue, type MockSecurityEvent } from "./events.js";

export interface ConditionEvaluation {
  readonly field: string;
  readonly operator: ComparisonOperator;
  readonly actual: JsonValue | undefined;
  readonly expected: JsonValue | undefined;
  readonly passed: boolean;
}

export interface ExpressionEvaluation {
  readonly passed: boolean;
  readonly conditions: readonly ConditionEvaluation[];
}

function literalValue(node: LiteralNode): JsonValue {
  switch (node.kind) {
    case "StringLiteral":
      return node.value;
    case "NumberLiteral":
      return node.value;
    case "BooleanLiteral":
      return node.value;
    case "DurationLiteral":
      return node.milliseconds;
  }
}

function describeOperand(node: ExpressionNode): string {
  switch (node.kind) {
    case "Identifier":
      return node.name;
    case "PropertyPath":
      return node.parts.join(".");
    case "StringLiteral":
      return JSON.stringify(node.value);
    case "NumberLiteral":
      return String(node.value);
    case "BooleanLiteral":
      return String(node.value);
    case "DurationLiteral":
      return node.raw;
    default:
      return "<expr>";
  }
}

function resolveOperand(node: ExpressionNode, event: MockSecurityEvent): JsonValue | undefined {
  switch (node.kind) {
    case "StringLiteral":
    case "NumberLiteral":
    case "BooleanLiteral":
    case "DurationLiteral":
      return literalValue(node);
    case "Identifier":
      return getProperty(event.properties, [node.name]);
    case "PropertyPath":
      return getProperty(event.properties, node.parts);
    default:
      return undefined;
  }
}

function compare(
  left: JsonValue | undefined,
  operator: ComparisonOperator,
  right: JsonValue | undefined,
): boolean {
  if (left === undefined || right === undefined) {
    return false;
  }
  switch (operator) {
    case "==":
      return left === right;
    case "!=":
      return left !== right;
    case ">":
      return typeof left === "number" && typeof right === "number" && left > right;
    case ">=":
      return typeof left === "number" && typeof right === "number" && left >= right;
    case "<":
      return typeof left === "number" && typeof right === "number" && left < right;
    case "<=":
      return typeof left === "number" && typeof right === "number" && left <= right;
  }
}

function evaluateComparison(
  expression: ComparisonExpressionNode,
  event: MockSecurityEvent,
): ConditionEvaluation {
  const actual = resolveOperand(expression.left, event);
  const expected = resolveOperand(expression.right, event);
  return {
    field: describeOperand(expression.left),
    operator: expression.operator,
    actual,
    expected,
    passed: compare(actual, expression.operator, expected),
  };
}

/**
 * Evaluate a condition expression and retain leaf comparison details for explainability.
 */
export function evaluateExpressionDetailed(
  expression: ExpressionNode,
  event: MockSecurityEvent,
): ExpressionEvaluation {
  switch (expression.kind) {
    case "ComparisonExpression": {
      const condition = evaluateComparison(expression, event);
      return { passed: condition.passed, conditions: [condition] };
    }
    case "BinaryExpression": {
      const left = evaluateExpressionDetailed(expression.left, event);
      const right = evaluateExpressionDetailed(expression.right, event);
      const passed =
        expression.operator === "and" ? left.passed && right.passed : left.passed || right.passed;
      return {
        passed,
        conditions: [...left.conditions, ...right.conditions],
      };
    }
    case "UnaryExpression": {
      const operand = evaluateExpressionDetailed(expression.operand, event);
      return {
        passed: !operand.passed,
        conditions: operand.conditions,
      };
    }
    case "BooleanLiteral":
      return { passed: expression.value, conditions: [] };
    default:
      return { passed: false, conditions: [] };
  }
}

export function evaluateExpression(expression: ExpressionNode, event: MockSecurityEvent): boolean {
  return evaluateExpressionDetailed(expression, event).passed;
}

export function eventMatchesTypeAndCondition(
  event: MockSecurityEvent,
  eventType: string,
  condition: ExpressionNode,
): boolean {
  if (event.type !== eventType) {
    return false;
  }
  return evaluateExpression(condition, event);
}

/**
 * Chain confidence is the minimum explicit confidence across matched events.
 * Missing confidence is treated as 0 (weakest link).
 */
export function chainConfidence(events: readonly MockSecurityEvent[]): number {
  if (events.length === 0) return 0;
  let min = Number.POSITIVE_INFINITY;
  for (const event of events) {
    const value = typeof event.confidence === "number" ? event.confidence : 0;
    min = Math.min(min, value);
  }
  return min === Number.POSITIVE_INFINITY ? 0 : min;
}

/** @deprecated Use chainConfidence. Kept as an alias for temporary compatibility. */
export const aggregateConfidence = chainConfidence;

export function countDistinctSources(events: readonly MockSecurityEvent[]): number {
  const sources = new Set<string>();
  for (const event of events) {
    if (event.source) {
      sources.add(event.source);
    }
  }
  return sources.size;
}

export type { JsonObject };
