import type { SourceRange } from "@aegisscript/ast";

export type TokenKind =
  | "Keyword"
  | "Identifier"
  | "String"
  | "Number"
  | "Duration"
  | "Boolean"
  | "Operator"
  | "Punctuation"
  | "Eof";

export interface Token {
  readonly kind: TokenKind;
  readonly lexeme: string;
  readonly range: SourceRange;
  /** Normalized value for literals when applicable. */
  readonly value?: string | number | boolean;
}

export const KEYWORDS = [
  "workspace",
  "asset",
  "telemetry",
  "rule",
  "observe",
  "then",
  "where",
  "within",
  "require",
  "respond",
  "approval",
  "required",
  "for",
  "rollback",
  "test",
  "expect",
  "to_match",
  "isolate",
  "endpoint",
  "preserve",
  "evidence",
  "reconnect",
  "and",
  "or",
  "not",
  "true",
  "false",
  "confidence",
  "sources",
] as const;

export type Keyword = (typeof KEYWORDS)[number];

export const KEYWORD_SET: ReadonlySet<string> = new Set(KEYWORDS);
