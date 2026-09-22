import { describe, expect, it } from "vitest";
import { dedupeText, splitTextLines } from "../../src/engines/text/dedupe-lines";

const defaults = {
  keep: "first" as const,
  ignoreBlankLines: true,
  ignoreSurroundingWhitespace: true,
  caseSensitive: true,
  order: "original" as const,
};

describe("splitTextLines", () => {
  it("CRLFとLFを同じように扱い末尾改行を余分な行にしない", () => {
    expect(splitTextLines("a\r\nb\r\n")).toEqual(["a", "b"]);
    expect(splitTextLines("a\nb")).toEqual(["a", "b"]);
  });
});

describe("dedupeText", () => {
  it("最初の行を残して元順を維持する", () => {
    const result = dedupeText("A\nB\nA\nC\nB", defaults);
    expect(result.lines).toEqual(["A", "B", "C"]);
    expect(result.duplicateCount).toBe(2);
  });

  it("最後の行を残す", () => {
    const result = dedupeText("A\nB\nA\nC\nB", { ...defaults, keep: "last" });
    expect(result.lines).toEqual(["A", "C", "B"]);
  });

  it("前後の空白を比較時だけ無視する", () => {
    const result = dedupeText("  A  \nA\nB", defaults);
    expect(result.lines).toEqual(["  A  ", "B"]);
  });

  it("大文字小文字を無視できる", () => {
    const result = dedupeText("Apple\napple\nAPPLE", { ...defaults, caseSensitive: false });
    expect(result.lines).toEqual(["Apple"]);
    expect(result.duplicateCount).toBe(2);
  });

  it("空行を無視して別件数で返す", () => {
    const result = dedupeText("A\n\n   \nA", defaults);
    expect(result.lines).toEqual(["A"]);
    expect(result.ignoredBlankCount).toBe(2);
    expect(result.duplicateCount).toBe(1);
  });

  it("結果を自然順で並べ替える", () => {
    const result = dedupeText("item10\nitem2\nitem1", { ...defaults, order: "sorted" });
    expect(result.lines).toEqual(["item1", "item2", "item10"]);
  });
});
