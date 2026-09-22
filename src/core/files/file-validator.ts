export type FileLimits = {
  maxFiles: number;
  maxFileBytes: number;
  maxTotalBytes: number;
  acceptedExtensions: string[];
  acceptedMimeTypes: string[];
};

export function validateImageFiles(files: File[], limits: FileLimits): string[] {
  const errors: string[] = [];
  if (files.length > limits.maxFiles) errors.push(`選択できる画像は最大${limits.maxFiles}枚です。`);
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > limits.maxTotalBytes) errors.push("選択ファイルの合計容量が上限を超えています。");

  for (const file of files) {
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
    const extOk = limits.acceptedExtensions.includes(ext);
    const mimeOk = limits.acceptedMimeTypes.includes(file.type);
    if (!extOk || !mimeOk) errors.push(`${file.name}: 対応していない形式です。`);
    if (file.size > limits.maxFileBytes) errors.push(`${file.name}: ファイルサイズが上限を超えています。`);
  }
  return errors;
}

export function fileIdentity(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}
