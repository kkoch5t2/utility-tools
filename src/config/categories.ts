import type { ToolDefinition } from "./tools";

export type ToolCategoryKey = ToolDefinition["category"];

export type CategoryMeta = {
  key: ToolCategoryKey;
  label: string;
  title: string;
  description: string;
  useCases: readonly string[];
};

export const categoryMeta: CategoryMeta[] = [
  {
    key: "image",
    label: "画像",
    title: "画像ツール一覧｜圧縮・リサイズ・形式変換を無料で",
    description: "画像の圧縮、リサイズ、WebP・JPG・PNG変換、トリミングなどをブラウザ内で使える無料ツール一覧です。",
    useCases: ["Web掲載前に画像容量を小さくしたい", "画像サイズや縦横比をまとめて調整したい", "PNG・JPG・WebPなどの形式を変換したい"],
  },
  {
    key: "csv",
    label: "CSV",
    title: "CSVツール一覧｜分割・結合・変換・整形を無料で",
    description: "CSVの分割、結合、文字コード変換、列編集、JSON・TSV変換などをブラウザ内で処理できる無料ツール一覧です。",
    useCases: ["大きなCSVを扱いやすいサイズに分割したい", "複数CSVの結合や列の整理をしたい", "CSV・JSON・TSV間でデータ形式を変換したい"],
  },
  {
    key: "json",
    label: "JSON",
    title: "JSONツール一覧｜整形・変換・抽出を無料で",
    description: "JSONの整形、配列操作、JSON Lines変換、キー抽出など、開発やデータ処理に使える無料JSONツール一覧です。",
    useCases: ["APIレスポンスのJSONを読みやすく整形したい", "JSONの構文やキー構造を確認したい", "配列の重複削除や必要な値だけの抽出をしたい"],
  },
  {
    key: "text",
    label: "テキスト",
    title: "テキストツール一覧｜文字数・整形・抽出を無料で",
    description: "文字数カウント、重複行削除、検索置換、URL抽出、空白や改行の整形などを無料で使えるテキストツール一覧です。",
    useCases: ["文章の文字数・行数をすぐ確認したい", "重複や空白、改行をまとめて整形したい", "文章やログからURL・メール・IPなどを抽出したい"],
  },
  {
    key: "pdf",
    label: "PDF",
    title: "PDFツール一覧｜結合・分割・画像変換を無料で",
    description: "PDFの結合、分割、ページ抽出、PNG画像変換などをブラウザ内で処理できる無料PDFツール一覧です。",
    useCases: ["複数のPDFを1ファイルにまとめたい", "必要なページだけ分割・抽出したい", "PDFページを画像として保存したい"],
  },
  {
    key: "qr",
    label: "QRコード",
    title: "QRコードツール一覧｜生成・読み取りを無料で",
    description: "URLやテキストからのQRコード生成と、画像からのQRコード読み取りをブラウザ内で行える無料ツール一覧です。",
    useCases: ["URLや文章をQRコードにしたい", "QRコード画像の内容を読み取りたい", "登録不要で手早くQRコードを作成したい"],
  },
  {
    key: "video",
    label: "動画",
    title: "動画ツール一覧｜圧縮・切り抜き・変換をブラウザで",
    description: "動画圧縮、切り抜き、音声削除、リサイズ、回転、速度変更、MP3・WebM・GIF変換をブラウザ内で処理できる無料ツール一覧です。",
    useCases: ["動画ファイルの容量や解像度を小さくしたい", "動画を切り抜き・回転・速度変更したい", "動画からMP3・WebM・GIFを作りたい"],
  },
  {
    key: "japanese",
    label: "日本語",
    title: "日本語ツール一覧｜全角半角・かな・和暦変換を無料で",
    description: "全角半角変換、ひらがな・カタカナ変換、和暦変換、日本語記号や空白の正規化などに使える無料ツール一覧です。",
    useCases: ["全角・半角やひらがな・カタカナを統一したい", "日本語の記号や空白をまとめて整形したい", "西暦と和暦をすばやく変換したい"],
  },
  {
    key: "date",
    label: "日付",
    title: "日付ツール一覧｜曜日・週番号・期間計算を無料で",
    description: "曜日、ISO週番号、月数差など、日付や期間をすぐ計算できる無料Webツール一覧です。",
    useCases: ["指定日の曜日や週番号を確認したい", "2つの日付の差や月数を計算したい", "営業日や年度など日付関連の値をすぐ求めたい"],
  },
  {
    key: "calculator",
    label: "計算",
    title: "計算ツール一覧｜割合・割引・時間・統計を無料で",
    description: "割合、割引、平均・中央値、データ容量、アスペクト比、時間差などをすぐ計算できる無料ツール一覧です。",
    useCases: ["割合・割引・税込価格をすぐ計算したい", "単位換算や時間・ペース計算をしたい", "平均・中央値など簡単な統計値を求めたい"],
  },
  {
    key: "developer",
    label: "開発者",
    title: "開発者向けツール一覧｜Base64・UUID・URL変換など",
    description: "Base64、UUID、URLエンコード、ハッシュ、JWT、正規表現、基数変換など、開発時に使える無料Webツール一覧です。",
    useCases: ["エンコード・デコード結果をすぐ確認したい", "UUID・ハッシュ・ランダム文字列を生成したい", "JSON・URL・正規表現などのデバッグを効率化したい"],
  },
  {
    key: "security",
    label: "セキュリティ",
    title: "セキュリティ・個人情報ツール一覧｜メタデータ・ログ・URLを無料確認",
    description: "パスワード強度、ログの伏字化、URLの追跡・機密パラメータ、ファイルハッシュ、画像EXIF、PDFメタデータ、APIキーらしい文字列をブラウザ内で確認できる無料ツール一覧です。",
    useCases: ["共有前にログやURLから個人情報・秘密値を確認したい", "画像やPDFに不要なメタデータが残っていないか確認したい", "ファイルの一致やパスワード強度を端末内でチェックしたい"],
  },
  {
    key: "share",
    label: "共有・調整",
    title: "共有・調整ツール一覧｜日程調整・投票・出欠・割り勘・共同作業",
    description: "日程調整、匿名投票、出欠確認、アンケート、くじ引き、空き時間、持ち物分担、共有TODO、割り勘などをURL共有で使える無料ツール一覧です。",
    useCases: ["複数人の日程・出欠・空き時間をまとめたい", "投票・アンケート・ランキングで候補を決めたい", "旅行やイベントの準備・立替・分担を共有したい"],
  },
];

export const categoryMetaByKey = new Map(categoryMeta.map((category) => [category.key, category]));
