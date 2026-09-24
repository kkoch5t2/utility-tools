import type { ToolDefinition } from "./tools";

export type ToolCategoryKey = ToolDefinition["category"];

export type CategoryMeta = {
  key: ToolCategoryKey;
  label: string;
  title: string;
  description: string;
};

export const categoryMeta: CategoryMeta[] = [
  {
    key: "image",
    label: "画像",
    title: "画像ツール一覧｜圧縮・リサイズ・形式変換を無料で",
    description: "画像の圧縮、リサイズ、WebP・JPG・PNG変換、トリミングなどをブラウザ内で使える無料ツール一覧です。",
  },
  {
    key: "csv",
    label: "CSV",
    title: "CSVツール一覧｜分割・結合・変換・整形を無料で",
    description: "CSVの分割、結合、文字コード変換、列編集、JSON・TSV変換などをブラウザ内で処理できる無料ツール一覧です。",
  },
  {
    key: "json",
    label: "JSON",
    title: "JSONツール一覧｜整形・変換・抽出を無料で",
    description: "JSONの整形、配列操作、JSON Lines変換、キー抽出など、開発やデータ処理に使える無料JSONツール一覧です。",
  },
  {
    key: "text",
    label: "テキスト",
    title: "テキストツール一覧｜文字数・整形・抽出を無料で",
    description: "文字数カウント、重複行削除、検索置換、URL抽出、空白や改行の整形などを無料で使えるテキストツール一覧です。",
  },
  {
    key: "pdf",
    label: "PDF",
    title: "PDFツール一覧｜結合・分割・画像変換を無料で",
    description: "PDFの結合、分割、ページ抽出、PNG画像変換などをブラウザ内で処理できる無料PDFツール一覧です。",
  },
  {
    key: "qr",
    label: "QRコード",
    title: "QRコードツール一覧｜生成・読み取りを無料で",
    description: "URLやテキストからのQRコード生成と、画像からのQRコード読み取りをブラウザ内で行える無料ツール一覧です。",
  },
  {
    key: "video",
    label: "動画",
    title: "動画ツール一覧｜圧縮・MP3変換をブラウザで",
    description: "動画圧縮や動画からMP3への音声抽出を、ファイルを外部サーバーへ送らずブラウザ内で処理できるツール一覧です。",
  },
  {
    key: "japanese",
    label: "日本語",
    title: "日本語ツール一覧｜全角半角・かな・和暦変換を無料で",
    description: "全角半角変換、ひらがな・カタカナ変換、和暦変換、日本語記号や空白の正規化などに使える無料ツール一覧です。",
  },
  {
    key: "date",
    label: "日付",
    title: "日付ツール一覧｜曜日・週番号・期間計算を無料で",
    description: "曜日、ISO週番号、月数差など、日付や期間をすぐ計算できる無料Webツール一覧です。",
  },
  {
    key: "calculator",
    label: "計算",
    title: "計算ツール一覧｜割合・割引・時間・統計を無料で",
    description: "割合、割引、平均・中央値、データ容量、アスペクト比、時間差などをすぐ計算できる無料ツール一覧です。",
  },
  {
    key: "developer",
    label: "開発者",
    title: "開発者向けツール一覧｜Base64・UUID・URL変換など",
    description: "Base64、UUID、URLエンコード、ハッシュ、JWT、正規表現、基数変換など、開発時に使える無料Webツール一覧です。",
  },
];

export const categoryMetaByKey = new Map(categoryMeta.map((category) => [category.key, category]));
