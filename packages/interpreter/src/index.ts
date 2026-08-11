export {
  interpret,
  collectTelemetrySources,
  type InterpretOptions,
  type InterpretResult,
  type RuleMatchResult,
  type TraceEntry,
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
  eventMatchesTypeAndCondition,
  chainConfidence,
  aggregateConfidence,
  countDistinctSources,
} from "./evaluate.js";
export {
  validateMockEvents,
  type EventDiagnostic,
  type EventValidationResult,
} from "./validate-events.js";
