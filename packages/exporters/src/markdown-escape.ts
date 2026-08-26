import type { JsonObject, JsonValue } from "@bitpall/interpreter";

/** Escape a value for use inside a Markdown table cell. */
export function escapeTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

/**
 * Escape characters that can break fenced/inline code or inject structure
 * when a value is embedded in Markdown prose or backticks.
 */
export function escapeInline(value: string): string {
  return value.replace(/([\\`|])/g, "\\$1").replace(/\r?\n/g, " ");
}

export function formatScalar(value: JsonValue | undefined): string {
  if (value === undefined) return "<missing>";
  if (typeof value === "string") return value;
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (value === null) return "null";
  return JSON.stringify(value);
}

export function flattenProperties(
  properties: JsonObject | undefined,
  prefix = "",
): Array<{ key: string; value: string }> {
  if (!properties) return [];
  const rows: Array<{ key: string; value: string }> = [];
  const keys = Object.keys(properties).sort();
  for (const key of keys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = properties[key];
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      rows.push(...flattenProperties(value as JsonObject, path));
    } else {
      rows.push({ key: path, value: formatScalar(value) });
    }
  }
  return rows;
}
