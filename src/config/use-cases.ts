export type UseCasePage = {
  slug: string;
  label: string;
  title: string;
  description: string;
  intro: string;
  bullets: readonly string[];
  toolIds: readonly string[];
};

export const useCasePages: readonly UseCasePage[] = [
  {
    slug: "image-optimize",
    label: "画像を軽く・見やすくする",
    title: "画像を軽くする無料ツール集｜圧縮・リサイズ・WebP変換",
    description: "画像容量を小さくしたい、サイズを揃えたい、WebPへ変換したいときに使える無料ツールを目的別にまとめています。",
    intro: "ブログ・Webサイト・資料で使う画像を、用途に合ったサイズと形式へ整えるためのツールをまとめました。",
    bullets: ["画像容量を小さくして表示を軽くしたい", "横幅や縦横比をWeb向けに揃えたい", "JPG・PNG・WebPを使い分けたい"],
    toolIds: ["image-compress","target-filesize","image-resize","webp-converter","png-to-jpg","image-batch-converter","image-crop"],
  },
  {
    slug: "csv-cleanup",
    label: "CSVを整理・加工する",
    title: "CSV整理・加工の無料ツール集｜分割・結合・重複削除・文字コード",
    description: "CSVの分割、結合、重複確認、空行削除、列編集、文字コード変換など、CSVを扱いやすくする無料ツールをまとめています。",
    intro: "大きなCSVや形式が揃っていないCSVを、集計・取込・共有しやすい状態へ整える作業向けです。",
    bullets: ["大きなCSVを小分けにしたい", "複数CSVをまとめたり不要行を整理したい", "列構成や文字コードを取込仕様に合わせたい"],
    toolIds: ["csv-split","csv-merge","csv-duplicates","csv-remove-empty","csv-columns","csv-sort","csv-filter","csv-encoding","csv-rename-headers","csv-value-count"],
  },
  {
    slug: "data-convert",
    label: "データ形式を変換する",
    title: "CSV・JSON・TSV変換ツール集｜データ形式を無料で相互変換",
    description: "CSV、JSON、TSV、JSON Linesなどを相互変換したいときに使える無料データ変換ツールをまとめています。",
    intro: "API、表計算、ログ、開発データなど、用途ごとに異なるデータ形式を扱いやすい形へ変換できます。",
    bullets: ["CSVとJSONを相互変換したい", "TSVやJSON Linesを別形式へ変えたい", "JSONを整形・フラット化して扱いやすくしたい"],
    toolIds: ["csv-json","csv-tsv","jsonl-json","json-formatter","json-flatten","json-typescript","querystring","json-string-codec"],
  },
  {
    slug: "text-cleanup",
    label: "テキストを整える",
    title: "テキスト整形の無料ツール集｜重複・空行・空白・改行をまとめて整理",
    description: "重複行、空行、前後空白、改行コード、文字置換など、コピペしたテキストを整える無料ツールをまとめています。",
    intro: "Excelやログ、生成AI、Webページなどからコピーした文章を、次の作業で使いやすい形へ整える用途に向いています。",
    bullets: ["重複行や空行をまとめて削除したい", "各行の空白や改行を揃えたい", "文字列を一括置換・並べ替えしたい"],
    toolIds: ["remove-duplicate-lines","remove-empty-lines","trim-lines","collapse-blank-lines","find-replace","line-ending","fullwidth-halfwidth","unicode-normalize","sort-lines"],
  },
  {
    slug: "developer-convert",
    label: "開発用の文字列を変換する",
    title: "開発者向け変換ツール集｜Base64・URL・HTML・HEX・Unicode",
    description: "Base64、URL、HTML、HEX、Unicode、Base64URLなど、開発中によく使う文字列変換ツールをまとめています。",
    intro: "API確認、ログ調査、設定値の確認、ちょっとしたデバッグで一度だけ変換したい場面をまとめて処理できます。",
    bullets: ["エンコード済み文字列の中身を確認したい", "URLやHTML向けに安全な文字列へ変換したい", "HEX・Unicode・識別子形式を変換したい"],
    toolIds: ["base64","base64url","url-codec","html-codec","hex-text","unicode-escape","identifier-case","querystring","jwt-decode"],
  },
  {
    slug: "pdf-organize",
    label: "PDFをまとめる・分ける",
    title: "PDF整理の無料ツール集｜結合・分割・ページ画像化",
    description: "複数PDFの結合、ページ範囲での分割、PDFページのPNG画像化をブラウザ内で行える無料ツールをまとめています。",
    intro: "申請書やスキャン資料など、PDFを提出・共有しやすい形へ整理するときに使えます。",
    bullets: ["複数PDFを1つにまとめたい", "必要なページだけ別ファイルにしたい", "PDFのページを画像として保存したい"],
    toolIds: ["pdf-merge","pdf-split","pdf-to-images"],
  },
  {
    slug: "japanese-cleanup",
    label: "日本語表記を揃える",
    title: "日本語表記を整える無料ツール集｜全角半角・かな・空白・記号",
    description: "全角半角、ひらがな・カタカナ、半角カナ、空白、句読点、Unicodeを揃える日本語整形ツールをまとめています。",
    intro: "フォームやCSV、名寄せ前のデータなど、日本語の表記揺れを減らしたいときに便利です。",
    bullets: ["全角・半角やかな表記を統一したい", "日本語の空白や記号を整えたい", "Unicode正規化で表記揺れを減らしたい"],
    toolIds: ["fullwidth-halfwidth","kana-converter","kana-normalize","punctuation-normalize","space-normalize","unicode-normalize","japanese-char-count"],
  },
  {
    slug: "date-calculation",
    label: "日付・期間を計算する",
    title: "日付計算の無料ツール集｜日数差・年齢・営業日・曜日・週番号",
    description: "日数差、年齢、日付加減算、営業日、曜日、週番号、月数差、年度などをすぐ計算できる無料ツールをまとめています。",
    intro: "カレンダーを行き来せず、日付に関するちょっとした確認をその場で済ませるためのツール集です。",
    bullets: ["2つの日付の差を知りたい", "年齢・営業日・曜日を確認したい", "日付を足したり年度・週番号を求めたい"],
    toolIds: ["date-difference","age","date-add","business-days","weekday","iso-week","month-difference","fiscal-year-jp"],
  },
  {
    slug: "video-edit",
    label: "動画を軽く・編集する",
    title: "動画編集の無料ツール集｜圧縮・切り抜き・回転・GIF・MP3変換",
    description: "動画圧縮、切り抜き、音声削除、リサイズ、回転、速度変更、MP3・WebM・GIF変換をブラウザ内で行えるツール集です。",
    intro: "専用ソフトを開くほどではない動画加工を、ブラウザだけで済ませたいときに使えるツールをまとめました。",
    bullets: ["動画容量や解像度を小さくしたい", "必要な部分だけ切り抜いたり回転したい", "動画からMP3・WebM・GIFを作りたい"],
    toolIds: ["video-compress","video-trim","video-mute","video-resize","video-rotate","video-speed","video-to-mp3","video-to-webm","video-to-gif"],
  },
] as const;

export const useCasePageBySlug = new Map(useCasePages.map((page) => [page.slug, page]));
