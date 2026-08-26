export {
  interpret,
  collectTelemetrySources,
  type InterpretOptions,
  type InterpretResult,
  type RuleMatchResult,
  type TraceEntry,
  type StageMatchExplanation,
  type RequirementEvaluation,
} from "./interpret.js";
export {
  eventTimeMs,
  orderEvents,
  getProperty,
  type MockSecurityEvent,
  type OrderedEvent,
  type JsonObject,
  type JsonValue,
} from "./events.js";
export {
  evaluateExpression,
  evaluateExpressionDetailed,
  eventMatchesTypeAndCondition,
  chainConfidence,
  aggregateConfidence,
  countDistinctSources,
  type ConditionEvaluation,
  type ExpressionEvaluation,
} from "./evaluate.js";
export {
  validateMockEvents,
  type EventDiagnostic,
  type EventValidationResult,
} from "./validate-events.js";
