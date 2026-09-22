export const imageToolConfig = {
  id: "image-batch-converter",
  name: "画像一括リサイズ・圧縮・WebP変換",
  category: "画像",
  href: "/image/batch-converter/",
  title: "画像一括リサイズ・圧縮・WebP変換｜無料・登録不要",
  description: "JPG・PNG・WebPをブラウザ内で一括リサイズ・圧縮・WebP変換。ファイルはサーバーへ送信されません。",
  acceptedFileTypes: [".jpg", ".jpeg", ".png", ".webp"],
  maxFiles: 100,
  maxFileBytes: 25 * 1024 * 1024,
  maxTotalBytes: 250 * 1024 * 1024,
  faqs: [
    ["画像はサーバーに送信されますか？", "いいえ。読み込みから変換、ZIP作成までブラウザ内で処理します。"],
    ["一度に何枚まで処理できますか？", "MVPでは最大100枚です。1ファイル25MB、合計250MBを上限にしています。"],
    ["EXIFなどのメタデータは残りますか？", "Canvasで再エンコードするため、原則として画像メタデータは出力に引き継ぎません。"],
  ],
} as const;
