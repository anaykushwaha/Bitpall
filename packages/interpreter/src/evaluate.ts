import type {
  ComparisonExpressionNode,
  ComparisonOperator,
  ExpressionNode,
  LiteralNode,
} from "@bitpall/ast";
import { getProperty, type JsonObject, type JsonValue, type MockSecurityEvent } from "./events.js";

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

export function evaluateExpression(expression: ExpressionNode, event: MockSecurityEvent): boolean {
  switch (expression.kind) {
    case "ComparisonExpression":
      return evaluateComparison(expression, event);
    case "BinaryExpression": {
      const left = evaluateExpression(expression.left, event);
      const right = evaluateExpression(expression.right, event);
      return expression.operator === "and" ? left && right : left || right;
    }
    case "UnaryExpression":
      return !evaluateExpression(expression.operand, event);
    case "BooleanLiteral":
      return expression.value;
    default:
      return false;
  }
}

function evaluateComparison(
  expression: ComparisonExpressionNode,
  event: MockSecurityEvent,
): boolean {
  const left = resolveOperand(expression.left, event);
  const right = resolveOperand(expression.right, event);
  return compare(left, expression.operator, right);
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
