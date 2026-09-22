import { describe, expect, it } from "vitest";
import Papa from "papaparse";
import { parseCsvText, splitRows } from "../../src/engines/csv/split-csv";

describe("CSV解析", () => {
  it("クォート内カンマ・改行・エスケープクォートを扱う", () => {
    const rows = parseCsvText('id,name,note\n1,"A,B","hello\nworld"\n2,"He said ""Hi""",ok');
    expect(rows).toEqual([
      ["id", "name", "note"],
      ["1", "A,B", "hello\nworld"],
      ["2", 'He said "Hi"', "ok"],
    ]);
  });

  it("空欄と最終行の改行有無を扱う", () => {
    const expected = [
      ["a", "b"],
      ["1", ""],
      ["2", "x"],
    ];
    expect(parseCsvText("a,b\n1,\n2,x")).toEqual(expected);
    expect(parseCsvText("a,b\n1,\n2,x\n")).toEqual(expected);
  });
});

describe("CSV分割", () => {
  const rows = [
    ["id", "name"],
    ["1", "A"],
    ["2", "B"],
    ["3", "C"],
  ];

  it("ヘッダーを各ファイルへ引き継ぐ", () => {
    const result = splitRows(rows, { rowsPerFile: 2, hasHeader: true, includeHeader: true });
    expect(result.chunks).toEqual([
      [["id", "name"], ["1", "A"], ["2", "B"]],
      [["id", "name"], ["3", "C"]],
    ]);
  });

  it("指定行数で割り切れる場合", () => {
    const result = splitRows(rows.slice(0, 3), { rowsPerFile: 1, hasHeader: true, includeHeader: false });
    expect(result.chunks).toHaveLength(2);
    expect(result.chunks.every((chunk) => chunk.length === 1)).toBe(true);
  });

  it("指定行数より少ないCSV", () => {
    const result = splitRows(rows.slice(0, 2), { rowsPerFile: 10, hasHeader: true, includeHeader: true });
    expect(result.chunks).toHaveLength(1);
  });

  it("空ファイル相当を扱う", () => {
    const result = splitRows([], { rowsPerFile: 10, hasHeader: false, includeHeader: false });
    expect(result.chunks).toEqual([]);
  });

  it("出力CSVも正しくクォートされる", () => {
    const output = Papa.unparse([["1", "A,B", "hello\nworld", 'He said "Hi"']]);
    expect(parseCsvText(output)[0]).toEqual(["1", "A,B", "hello\nworld", 'He said "Hi"']);
  });
});
