export type ResizeMode = "original" | "long-edge" | "width" | "height";
export type OutputFormat = "webp" | "jpeg" | "png";

export type ImageOptions = {
  mode: ResizeMode;
  targetSize: number;
  allowUpscale: boolean;
  format: OutputFormat;
  quality: number;
  backgroundColor: string;
  suffix: string;
};

export type ImageResult = {
  blob: Blob;
  width: number;
  height: number;
  filename: string;
  originalBytes: number;
};

export function calculateTargetSize(
  width: number,
  height: number,
  mode: ResizeMode,
  targetSize: number,
  allowUpscale: boolean,
): { width: number; height: number } {
  if (mode === "original") return { width, height };
  const requested =
    mode === "long-edge" ? targetSize / Math.max(width, height) :
    mode === "width" ? targetSize / width :
    targetSize / height;
  const scale = allowUpscale ? requested : Math.min(1, requested);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function outputFilename(name: string, suffix: string, format: OutputFormat): string {
  const base = name.replace(/.[^.]+$/, "");
  const ext = format === "jpeg" ? "jpg" : format;
  return `${base}${suffix}.${ext}`;
}

export async function convertImage(file: File, options: ImageOptions): Promise<ImageResult> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    if (bitmap.width * bitmap.height > 40_000_000) {
      throw new Error("画像の総画素数が大きすぎます（上限40MP）。");
    }
    const size = calculateTargetSize(bitmap.width, bitmap.height, options.mode, options.targetSize, options.allowUpscale);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d", { alpha: options.format !== "jpeg" });
    if (!context) throw new Error("画像処理用Canvasを初期化できませんでした。");

    if (options.format === "jpeg") {
      context.fillStyle = options.backgroundColor;
      context.fillRect(0, 0, size.width, size.height);
    }
    context.drawImage(bitmap, 0, 0, size.width, size.height);

    const mime = `image/${options.format}`;
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error("画像をエンコードできませんでした。")), mime, options.quality);
    });
    return {
      blob,
      width: size.width,
      height: size.height,
      filename: outputFilename(file.name, options.suffix, options.format),
      originalBytes: file.size,
    };
  } finally {
    bitmap.close();
  }
}
