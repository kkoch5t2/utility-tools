export type KeepOccurrence = "first" | "last";
export type OutputOrder = "original" | "sorted";

export type DedupeOptions = {
  keep: KeepOccurrence;
  ignoreBlankLines: boolean;
  ignoreSurroundingWhitespace: boolean;
  caseSensitive: boolean;
  order: OutputOrder;
};

export type DedupeResult = {
  lines: string[];
  inputLineCount: number;
  outputLineCount: number;
  duplicateCount: number;
  ignoredBlankCount: number;
};

export function splitTextLines(text: string): string[] {
  if (text === "") return [];
  const normalized = text.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  if (normalized.endsWith("\n")) lines.pop();
  return lines;
}

function comparisonKey(line: string, options: DedupeOptions): string {
  const whitespaceNormalized = options.ignoreSurroundingWhitespace ? line.trim() : line;
  return options.caseSensitive ? whitespaceNormalized : whitespaceNormalized.toLocaleLowerCase();
}

export function dedupeText(text: string, options: DedupeOptions): DedupeResult {
  const inputLines = splitTextLines(text);
  const candidates: string[] = [];
  let ignoredBlankCount = 0;

  for (const line of inputLines) {
    if (options.ignoreBlankLines && line.trim() === "") {
      ignoredBlankCount++;
      continue;
    }
    candidates.push(line);
  }

  const seen = new Set<string>();
  const output: string[] = [];
  let duplicateCount = 0;

  if (options.keep === "first") {
    for (const line of candidates) {
      const key = comparisonKey(line, options);
      if (seen.has(key)) duplicateCount++;
      else {
        seen.add(key);
        output.push(line);
      }
    }
  } else {
    for (let index = candidates.length - 1; index >= 0; index--) {
      const line = candidates[index];
      const key = comparisonKey(line, options);
      if (seen.has(key)) duplicateCount++;
      else {
        seen.add(key);
        output.push(line);
      }
    }
    output.reverse();
  }

  if (options.order === "sorted") {
    output.sort((a, b) => comparisonKey(a, options).localeCompare(
      comparisonKey(b, options),
      "ja",
      { numeric: true, sensitivity: options.caseSensitive ? "variant" : "base" },
    ));
  }

  return {
    lines: output,
    inputLineCount: inputLines.length,
    outputLineCount: output.length,
    duplicateCount,
    ignoredBlankCount,
  };
}
