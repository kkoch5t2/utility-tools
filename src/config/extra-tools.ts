export type ExtraToolFamily = "image" | "csv" | "text" | "pdf" | "qr" | "developer";

export type ExtraToolMeta = {
  id: string;
  mode: string;
  family: ExtraToolFamily;
  category: string;
  categoryKey: ExtraToolFamily;
  href: string;
  name: string;
  title: string;
  description: string;
  faqs: readonly (readonly [string, string])[];
};

const privacyFaq = ["入力したデータはサーバーに送信されますか？", "いいえ。このツールの処理はブラウザ内で完結します。"] as const;

export const extraTools: ExtraToolMeta[] = [
  {
    id: "image-compress", mode: "compress", family: "image", category: "画像", categoryKey: "image",
    href: "/image/compress/", name: "画像圧縮",
    title: "画像圧縮ツール｜JPG・PNG・WebPを無料で圧縮",
    description: "JPG・PNG・WebP画像をブラウザ内で圧縮し、容量を小さくします。",
    faqs: [["画質は調整できますか？", "はい。品質スライダーで圧縮率を調整できます。"], privacyFaq],
  },
  {
    id: "image-resize", mode: "resize", family: "image", category: "画像", categoryKey: "image",
    href: "/image/resize/", name: "画像サイズ変更",
    title: "画像サイズ変更ツール｜幅・高さを無料でリサイズ",
    description: "画像の幅・高さを指定してリサイズします。縦横比の維持にも対応します。",
    faqs: [["縦横比を維持できますか？", "はい。縦横比を維持したまま幅または高さを基準に変更できます。"], privacyFaq],
  },
  {
    id: "png-to-jpg", mode: "png-to-jpg", family: "image", category: "画像", categoryKey: "image",
    href: "/image/png-to-jpg/", name: "PNG → JPG変換",
    title: "PNGをJPGに変換｜無料・ブラウザ内処理",
    description: "PNG画像をJPEGへ変換します。透明部分の背景色も指定できます。",
    faqs: [["透明部分はどうなりますか？", "指定した背景色で塗りつぶしてJPEGへ変換します。"], privacyFaq],
  },
  {
    id: "webp-converter", mode: "webp-converter", family: "image", category: "画像", categoryKey: "image",
    href: "/image/webp-converter/", name: "WebP → JPG・PNG変換",
    title: "WebPをJPG・PNGに変換｜無料",
    description: "WebP画像をJPGまたはPNGへ変換します。",
    faqs: [["JPGとPNGのどちらに変換できますか？", "どちらも選択できます。"], privacyFaq],
  },  {
    id: "image-crop", mode: "crop", family: "image", category: "画像", categoryKey: "image",
    href: "/image/crop/", name: "画像トリミング",
    title: "画像トリミングツール｜範囲指定で切り抜き",
    description: "画像のX・Y座標と幅・高さを指定して切り抜きます。",
    faqs: [["切り抜く範囲は数値指定できますか？", "はい。開始位置と幅・高さをピクセル単位で指定できます。"], privacyFaq],
  },
  {
    id: "target-filesize", mode: "target-filesize", family: "image", category: "画像", categoryKey: "image",
    href: "/image/target-filesize/", name: "画像を指定容量以下に圧縮",
    title: "画像を500KB・1MB以下に圧縮｜容量指定",
    description: "目標容量をKBで指定し、JPEGまたはWebPの品質を自動調整します。",
    faqs: [["必ず指定容量以下になりますか？", "品質を下げても到達できない場合は、その時点で最小に近い結果を表示します。"], privacyFaq],
  },
  {
    id: "csv-merge", mode: "merge", family: "csv", category: "CSV", categoryKey: "csv",
    href: "/csv/merge/", name: "CSV結合",
    title: "CSV結合ツール｜複数CSVを1つにまとめる",
    description: "複数のCSVファイルを読み込み、列名を合わせて1つのCSVに結合します。",
    faqs: [["列の順番が違っても結合できますか？", "はい。ヘッダー名を基準に列を合わせます。"], privacyFaq],
  },
  {
    id: "csv-columns", mode: "columns", family: "csv", category: "CSV", categoryKey: "csv",
    href: "/csv/columns/", name: "CSV列削除・並べ替え",
    title: "CSVの列を削除・並べ替え｜無料",
    description: "CSVの列名を指定して、必要な列だけを好きな順番で出力します。",
    faqs: [["列の並べ替え方は？", "読み込み後に表示される列名をカンマ区切りで並べ直します。"], privacyFaq],
  },  {
    id: "csv-encoding", mode: "encoding", family: "csv", category: "CSV", categoryKey: "csv",
    href: "/csv/encoding/", name: "CSV文字コード変換",
    title: "CSV文字コード変換｜UTF-8・Shift_JIS対応",
    description: "CSVをUTF-8、BOM付きUTF-8、Shift_JISへブラウザ内で変換します。",
    faqs: [["Shift_JISに対応していますか？", "はい。UTF-8系とShift_JISの相互変換に対応します。"], privacyFaq],
  },
  {
    id: "csv-json", mode: "csv-json", family: "csv", category: "CSV・JSON", categoryKey: "csv",
    href: "/csv/json-converter/", name: "CSV ⇔ JSON変換",
    title: "CSVとJSONを相互変換｜無料",
    description: "CSVをJSONへ、JSON配列をCSVへ相互変換します。",
    faqs: [["JSONはどんな形式に対応しますか？", "オブジェクトの配列をCSVへ変換できます。"], privacyFaq],
  },
  {
    id: "json-formatter", mode: "json-formatter", family: "text", category: "テキスト", categoryKey: "text",
    href: "/text/json-formatter/", name: "JSON整形・圧縮・構文チェック",
    title: "JSON整形・圧縮・構文チェック｜無料",
    description: "JSONを読みやすく整形、1行に圧縮、構文エラーを確認できます。",
    faqs: [["JSONのエラーも分かりますか？", "はい。JSON.parseで検出した構文エラーを表示します。"], privacyFaq],
  },
  {
    id: "character-count", mode: "character-count", family: "text", category: "テキスト", categoryKey: "text",
    href: "/text/character-count/", name: "文字数カウント",
    title: "文字数カウント｜文字・行・バイト数を即時計測",
    description: "入力テキストの文字数、空白除外文字数、行数、UTF-8バイト数を数えます。",
    faqs: [["改行も文字数に含まれますか？", "通常の文字数には含まれます。行数は別に表示します。"], privacyFaq],
  },  {
    id: "fullwidth-halfwidth", mode: "fullwidth-halfwidth", family: "text", category: "テキスト", categoryKey: "text",
    href: "/text/fullwidth-halfwidth/", name: "全角・半角変換",
    title: "全角・半角変換｜英数字・スペースを一括変換",
    description: "英数字・記号・スペースを全角または半角へ一括変換します。",
    faqs: [["日本語の漢字やひらがなも変わりますか？", "いいえ。主にASCII範囲の英数字・記号とスペースを対象にします。"], privacyFaq],
  },
  {
    id: "newline-converter", mode: "newline-converter", family: "text", category: "テキスト", categoryKey: "text",
    href: "/text/newline-converter/", name: "改行削除・置換",
    title: "改行削除・置換ツール｜空白・カンマへ一括変換",
    description: "改行を削除したり、空白・カンマ・任意文字列へ置換します。",
    faqs: [["CRLFとLFの両方に対応しますか？", "はい。Windows・Unix系の改行をまとめて処理します。"], privacyFaq],
  },
  {
    id: "pdf-merge", mode: "merge", family: "pdf", category: "PDF", categoryKey: "pdf",
    href: "/pdf/merge/", name: "PDF結合",
    title: "PDF結合ツール｜複数PDFを無料で1つに",
    description: "複数のPDFを選択順に結合し、1つのPDFとして保存します。",
    faqs: [["PDFはアップロードされますか？", "いいえ。PDFの読み込みと結合はブラウザ内で処理します。"], privacyFaq],
  },
  {
    id: "pdf-split", mode: "split", family: "pdf", category: "PDF", categoryKey: "pdf",
    href: "/pdf/split/", name: "PDF分割・ページ抽出",
    title: "PDF分割・ページ抽出｜ページ範囲を指定",
    description: "PDFのページ範囲を指定し、複数PDFへ分割してZIPで保存します。",
    faqs: [["ページ範囲はどう指定しますか？", "1-3,4-6,8 のようにカンマ区切りで指定できます。"], privacyFaq],
  },  {
    id: "pdf-to-images", mode: "to-images", family: "pdf", category: "PDF", categoryKey: "pdf",
    href: "/pdf/to-images/", name: "PDF → PNG画像変換",
    title: "PDFをPNG画像に変換｜ページごとに保存",
    description: "PDF各ページをPNG画像へ変換し、ZIPでまとめて保存します。",
    faqs: [["複数ページも変換できますか？", "はい。全ページを順番にPNG化します。"], privacyFaq],
  },
  {
    id: "qr-generate", mode: "generate", family: "qr", category: "QRコード", categoryKey: "qr",
    href: "/qr/generate/", name: "QRコード生成",
    title: "QRコード生成｜URL・テキストから無料作成",
    description: "URLやテキストからQRコードを生成し、PNGで保存できます。",
    faqs: [["日本語もQRコードにできますか？", "はい。日本語を含むテキストにも対応します。"], privacyFaq],
  },
  {
    id: "qr-read", mode: "read", family: "qr", category: "QRコード", categoryKey: "qr",
    href: "/qr/read/", name: "QRコード読み取り",
    title: "QRコード読み取り｜画像から内容を解析",
    description: "QRコード画像を選択し、ブラウザ内で内容を読み取ります。",
    faqs: [["撮影済みの画像から読み取れますか？", "はい。PNG・JPG・WebP画像を選択できます。"], privacyFaq],
  },
  {
    id: "uuid-generator", mode: "uuid", family: "developer", category: "開発者", categoryKey: "developer",
    href: "/developer/uuid/", name: "UUID生成",
    title: "UUID v4生成ツール｜まとめて無料生成",
    description: "ブラウザの暗号学的乱数を使ってUUID v4をまとめて生成します。",
    faqs: [["UUID v4ですか？", "はい。crypto.randomUUID()を利用してUUID v4を生成します。"], privacyFaq],
  },
  {
    id: "unix-time", mode: "unix-time", family: "developer", category: "開発者", categoryKey: "developer",
    href: "/developer/unix-time/", name: "Unix時間変換",
    title: "Unix時間・日時変換｜秒・ミリ秒対応",
    description: "Unixタイムスタンプと日時を相互変換します。秒・ミリ秒を自動判定します。",
    faqs: [["秒とミリ秒の両方に対応しますか？", "はい。桁数をもとに自動判定します。"], privacyFaq],
  },
];

export const extraToolByPath = new Map(extraTools.map((tool) => [tool.href, tool]));
