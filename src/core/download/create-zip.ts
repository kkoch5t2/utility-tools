import JSZip from "jszip";

export async function createZip(
  files: Array<{ filename: string; blob: Blob }>,
  onProgress?: (percent: number) => void,
): Promise<Blob> {
  const zip = new JSZip();
  for (const file of files) zip.file(file.filename, file.blob);
  return zip.generateAsync(
    { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
    (meta) => onProgress?.(Math.round(meta.percent)),
  );
}
