export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export interface MockSecurityEvent {
  readonly id: string;
  readonly type: string;
  /** ISO-8601 timestamp or epoch milliseconds. */
  readonly timestamp: string | number;
  readonly properties: JsonObject;
  readonly source?: string;
  readonly confidence?: number;
}

export function eventTimeMs(event: MockSecurityEvent): number {
  if (typeof event.timestamp === "number") {
    return event.timestamp;
  }
  const parsed = Date.parse(event.timestamp);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid event timestamp for event '${event.id}': ${event.timestamp}`);
  }
  return parsed;
}

export function getProperty(
  properties: JsonObject,
  path: readonly string[],
): JsonValue | undefined {
  let current: JsonValue | undefined = properties;
  for (const part of path) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object" ||
      Array.isArray(current)
    ) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}
