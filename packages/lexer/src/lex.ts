import {
  createDiagnostic,
  positionAt,
  type Diagnostic,
  type SourceFile,
  type SourceRange,
} from "@bitpall/ast";
import { KEYWORD_SET, type Token } from "./token.js";

export interface LexResult {
  readonly tokens: Token[];
  readonly diagnostics: Diagnostic[];
}

function range(text: string, start: number, end: number): SourceRange {
  return {
    start: positionAt(text, start),
    end: positionAt(text, end),
  };
}

function isAlpha(ch: string): boolean {
  return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_";
}

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}

function isAlphaNumeric(ch: string): boolean {
  return isAlpha(ch) || isDigit(ch);
}

export function lex(source: SourceFile): LexResult {
  const { text, fileName } = source;
  const tokens: Token[] = [];
  const diagnostics: Diagnostic[] = [];
  let i = 0;

  const push = (token: Token): void => {
    tokens.push(token);
  };

  while (i < text.length) {
    const ch = text[i]!;

    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
      i += 1;
      continue;
    }

    if (ch === "/" && text[i + 1] === "/") {
      i += 2;
      while (i < text.length && text[i] !== "\n") {
        i += 1;
      }
      continue;
    }

    if (ch === '"') {
      const start = i;
      i += 1;
      let value = "";
      let terminated = false;
      while (i < text.length) {
        const c = text[i]!;
        if (c === '"') {
          terminated = true;
          i += 1;
          break;
        }
        if (c === "\n") {
          break;
        }
        if (c === "\\" && i + 1 < text.length) {
          const next = text[i + 1]!;
          if (next === "n") {
            value += "\n";
          } else if (next === "t") {
            value += "\t";
          } else if (next === '"' || next === "\\") {
            value += next;
          } else {
            value += next;
          }
          i += 2;
          continue;
        }
        value += c;
        i += 1;
      }
      if (!terminated) {
        diagnostics.push(
          createDiagnostic({
            code: "AEGIS1002",
            severity: "error",
            message: "Unterminated string literal",
            fileName,
            range: range(text, start, i),
            suggestion: 'Close the string with a matching " character.',
          }),
        );
      }
      push({
        kind: "String",
        lexeme: text.slice(start, i),
        range: range(text, start, i),
        value,
      });
      continue;
    }

    if (isDigit(ch)) {
      const start = i;
      i += 1;
      while (i < text.length && isDigit(text[i]!)) {
        i += 1;
      }
      if (text[i] === "." && i + 1 < text.length && isDigit(text[i + 1]!)) {
        i += 1;
        while (i < text.length && isDigit(text[i]!)) {
          i += 1;
        }
      }

      const unit = text[i];
      if (unit === "s" || unit === "m" || unit === "h") {
        // Durations must be integer amounts (e.g. 30s, 2m). Reject 1.5m as a duration.
        const numericPart = text.slice(start, i);
        if (numericPart.includes(".")) {
          diagnostics.push(
            createDiagnostic({
              code: "AEGIS1003",
              severity: "error",
              message: `Invalid duration '${numericPart}${unit}'; durations must use whole numbers`,
              fileName,
              range: range(text, start, i + 1),
            }),
          );
        }
        i += 1;
        const lexeme = text.slice(start, i);
        push({
          kind: "Duration",
          lexeme,
          range: range(text, start, i),
          value: lexeme,
        });
        continue;
      }

      const lexeme = text.slice(start, i);
      push({
        kind: "Number",
        lexeme,
        range: range(text, start, i),
        value: Number(lexeme),
      });
      continue;
    }

    if (isAlpha(ch)) {
      const start = i;
      i += 1;
      while (i < text.length && isAlphaNumeric(text[i]!)) {
        i += 1;
      }
      const lexeme = text.slice(start, i);
      if (lexeme === "true" || lexeme === "false") {
        push({
          kind: "Boolean",
          lexeme,
          range: range(text, start, i),
          value: lexeme === "true",
        });
      } else if (KEYWORD_SET.has(lexeme)) {
        push({
          kind: "Keyword",
          lexeme,
          range: range(text, start, i),
        });
      } else {
        push({
          kind: "Identifier",
          lexeme,
          range: range(text, start, i),
          value: lexeme,
        });
      }
      continue;
    }

    // Multi-character operators first
    const two = text.slice(i, i + 2);
    if (two === "==" || two === "!=" || two === ">=" || two === "<=") {
      push({
        kind: "Operator",
        lexeme: two,
        range: range(text, i, i + 2),
      });
      i += 2;
      continue;
    }

    if (ch === ">" || ch === "<") {
      push({
        kind: "Operator",
        lexeme: ch,
        range: range(text, i, i + 1),
      });
      i += 1;
      continue;
    }

    if (
      ch === "{" ||
      ch === "}" ||
      ch === "(" ||
      ch === ")" ||
      ch === ";" ||
      ch === "." ||
      ch === "="
    ) {
      push({
        kind: "Punctuation",
        lexeme: ch,
        range: range(text, i, i + 1),
      });
      i += 1;
      continue;
    }

    diagnostics.push(
      createDiagnostic({
        code: "AEGIS1001",
        severity: "error",
        message: `Invalid character '${ch}'`,
        fileName,
        range: range(text, i, i + 1),
      }),
    );
    i += 1;
  }

  push({
    kind: "Eof",
    lexeme: "",
    range: range(text, text.length, text.length),
  });

  return { tokens, diagnostics };
}
