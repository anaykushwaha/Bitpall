export {
  interpret,
  type InterpretOptions,
  type InterpretResult,
  type RuleMatchResult,
  type TraceEntry,
} from "./interpret.js";
export {
  eventTimeMs,
  getProperty,
  type MockSecurityEvent,
  type JsonObject,
  type JsonValue,
} from "./events.js";
export {
  evaluateExpression,
  eventMatchesTypeAndCondition,
  aggregateConfidence,
  countDistinctSources,
} from "./evaluate.js";
