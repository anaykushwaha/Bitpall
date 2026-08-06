export interface SourcePosition {
  readonly line: number;
  readonly column: number;
  readonly offset: number;
}

export interface SourceRange {
  readonly start: SourcePosition;
  readonly end: SourcePosition;
}

export interface SourceFile {
  readonly fileName: string;
  readonly text: string;
}

export function createSourceFile(fileName: string, text: string): SourceFile {
  return { fileName, text };
}

export function positionAt(text: string, offset: number): SourcePosition {
  let line = 1;
  let column = 1;
  const clamped = Math.max(0, Math.min(offset, text.length));
  for (let i = 0; i < clamped; i += 1) {
    if (text[i] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column, offset: clamped };
}

export function rangeOf(text: string, startOffset: number, endOffset: number): SourceRange {
  return {
    start: positionAt(text, startOffset),
    end: positionAt(text, endOffset),
  };
}

export const EMPTY_RANGE: SourceRange = {
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 1, offset: 0 },
};
