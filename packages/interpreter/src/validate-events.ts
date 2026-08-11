import type { JsonObject, MockSecurityEvent } from "./events.js";

export interface EventDiagnostic {
  readonly path: string;
  readonly message: string;
}

export interface EventValidationResult {
  readonly events: MockSecurityEvent[];
  readonly diagnostics: EventDiagnostic[];
  readonly ok: boolean;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidTimestamp(value: unknown): boolean {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (typeof value === "string" && value.length > 0) {
    return !Number.isNaN(Date.parse(value));
  }
  return false;
}

/**
 * Validate mock cybersecurity event JSON without throwing for ordinary user errors.
 */
export function validateMockEvents(input: unknown): EventValidationResult {
  const diagnostics: EventDiagnostic[] = [];

  if (!Array.isArray(input)) {
    return {
      events: [],
      diagnostics: [{ path: "$", message: "Mock events must be a JSON array" }],
      ok: false,
    };
  }

  const events: MockSecurityEvent[] = [];
  const seenIds = new Map<string, number>();

  input.forEach((item, index) => {
    const path = `$[${index}]`;
    if (!isPlainObject(item)) {
      diagnostics.push({ path, message: "Event must be an object" });
      return;
    }

    let valid = true;

    const id = item.id;
    if (typeof id !== "string" || id.length === 0) {
      diagnostics.push({ path: `${path}.id`, message: "Event id must be a non-empty string" });
      valid = false;
    } else if (seenIds.has(id)) {
      diagnostics.push({
        path: `${path}.id`,
        message: `Duplicate event id '${id}' (first seen at index ${seenIds.get(id)})`,
      });
      valid = false;
    } else {
      seenIds.set(id, index);
    }

    const type = item.type;
    if (typeof type !== "string" || type.length === 0) {
      diagnostics.push({ path: `${path}.type`, message: "Event type must be a non-empty string" });
      valid = false;
    }

    if (!("timestamp" in item) || !isValidTimestamp(item.timestamp)) {
      diagnostics.push({
        path: `${path}.timestamp`,
        message: "Event timestamp must be a valid ISO-8601 string or finite epoch milliseconds",
      });
      valid = false;
    }

    if (!("properties" in item) || !isPlainObject(item.properties)) {
      diagnostics.push({
        path: `${path}.properties`,
        message: "Event properties must be a JSON object",
      });
      valid = false;
    }

    if ("source" in item && item.source !== undefined) {
      if (typeof item.source !== "string" || item.source.length === 0) {
        diagnostics.push({
          path: `${path}.source`,
          message: "Event source must be a non-empty string when provided",
        });
        valid = false;
      }
    }

    if ("confidence" in item && item.confidence !== undefined) {
      if (!isFiniteNumber(item.confidence)) {
        diagnostics.push({
          path: `${path}.confidence`,
          message: "Event confidence must be a finite number when provided",
        });
        valid = false;
      } else if (item.confidence < 0 || item.confidence > 1) {
        diagnostics.push({
          path: `${path}.confidence`,
          message: `Event confidence ${item.confidence} must be between 0 and 1`,
        });
        valid = false;
      }
    }

    if (!valid) {
      return;
    }

    const event: MockSecurityEvent = {
      id: id as string,
      type: type as string,
      timestamp: item.timestamp as string | number,
      properties: item.properties as JsonObject,
      ...(typeof item.source === "string" ? { source: item.source } : {}),
      ...(typeof item.confidence === "number" ? { confidence: item.confidence } : {}),
    };
    events.push(event);
  });

  return {
    events,
    diagnostics,
    ok: diagnostics.length === 0,
  };
}
