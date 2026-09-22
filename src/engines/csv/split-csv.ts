import Papa from "papaparse";
import { ProcessingCancelledError } from "../../core/processing/cancellation";

export type CsvSplitOptions = {
  rowsPerFile: number;
  hasHeader: boolean;
  includeHeader: boolean;
  filenamePrefix: string;
  newline: "\n" | "\r\n";
};

export type CsvPart = {
  filename: string;
  blob: Blob;
  dataRowCount: number;
};

export type CsvSplitResult = {
  parts: CsvPart[];
  totalDataRows: number;
};

export function parseCsvText(text: string): string[][] {
  const parsed = Papa.parse<string[]>(text, { delimiter: ",", skipEmptyLines: false });
  if (parsed.errors.length) throw new Error(parsed.errors[0].message);
  const rows = [...parsed.data];
  if (/\r?\n$/.test(text) && rows.at(-1)?.length === 1 && rows.at(-1)?.[0] === "") rows.pop();
  return rows;
}

export function splitRows(
  rows: string[][],
  options: Pick<CsvSplitOptions, "rowsPerFile" | "hasHeader" | "includeHeader">,
): { header: string[] | null; chunks: string[][][] } {
  const source = [...rows];
  const header = options.hasHeader ? (source.shift() ?? null) : null;
  const chunks: string[][][] = [];
  for (let index = 0; index < source.length; index += options.rowsPerFile) {
    const data = source.slice(index, index + options.rowsPerFile);
    chunks.push(header && options.includeHeader ? [header, ...data] : data);
  }
  return { header, chunks };
}

export function splitCsvFile(
  file: File,
  options: CsvSplitOptions,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<CsvSplitResult> {
  return new Promise((resolve, reject) => {
    if (!Number.isInteger(options.rowsPerFile) || options.rowsPerFile < 1) {
      reject(new Error("1ファイルあたりの行数は1以上の整数で指定してください。"));
      return;
    }

    const parts: CsvPart[] = [];
    let header: string[] | null = null;
    let currentRows: string[][] = [];
    let totalDataRows = 0;
    let partNumber = 1;
    let settled = false;
    let pendingRow: string[] | null = null;

    const finishReject = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error instanceof Error ? error : new Error("CSVの形式を解析できませんでした。"));
    };

    const flush = () => {
      if (!currentRows.length) return;
      const rows = header && options.includeHeader ? [header, ...currentRows] : currentRows;
      const csv = Papa.unparse(rows, { newline: options.newline });
      const filename = `${options.filenamePrefix || "split"}-${String(partNumber).padStart(3, "0")}.csv`;
      parts.push({
        filename,
        blob: new Blob([csv], { type: "text/csv;charset=utf-8" }),
        dataRowCount: currentRows.length,
      });
      currentRows = [];
      partNumber++;
    };

    const processRow = (row: string[]) => {
      if (options.hasHeader && header === null) {
        header = row;
        return;
      }
      currentRows.push(row);
      totalDataRows++;
      if (currentRows.length >= options.rowsPerFile) flush();
    };

    Papa.parse<string[]>(file, {
      encoding: "UTF-8",
      skipEmptyLines: false,
      chunkSize: 1024 * 1024,
      chunk: (result, parser) => {
        if (signal?.aborted) {
          parser.abort();
          finishReject(new ProcessingCancelledError());
          return;
        }
        if (result.errors.length) {
          parser.abort();
          finishReject(new Error(result.errors[0].message));
          return;
        }

        for (const row of result.data) {
          if (pendingRow !== null) processRow(pendingRow);
          pendingRow = row;
        }

        const cursor = Number(result.meta.cursor ?? 0);
        onProgress?.(Math.max(0, Math.min(99, Math.round((cursor / Math.max(file.size, 1)) * 100))));
      },
      complete: () => {
        if (settled) return;
        if (pendingRow && !(pendingRow.length === 1 && pendingRow[0] === "")) processRow(pendingRow);
        pendingRow = null;
        flush();
        settled = true;
        onProgress?.(100);
        resolve({ parts, totalDataRows });
      },
      error: (error) => finishReject(error),
    });
  });
}
