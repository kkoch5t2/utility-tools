export const csvSplitConfig = {
  id: "csv-split",
  name: "CSV分割",
  category: "CSV",
  href: "/csv/split/",
  title: "CSV分割ツール｜無料・登録不要",
  description: "CSVファイルを指定したデータ行数ごとに分割します。クォート内のカンマや改行にも対応し、ファイルはサーバーへ送信されません。",
  acceptedFileTypes: [".csv", "text/csv"],
  maxFileBytes: 200 * 1024 * 1024,
  faqs: [
    ["クォート内のカンマや改行に対応していますか？", "はい。単純な改行分割ではなくCSVとして解析するため、ダブルクォート内のカンマ・改行・エスケープされたダブルクォートを扱えます。"],
    ["文字コードは何に対応していますか？", "MVPではUTF-8とBOM付きUTF-8に対応しています。Shift_JISは今後の追加候補です。"],
    ["ファイルはアップロードされますか？", "いいえ。CSVの解析・分割・ZIP作成はブラウザ内で行います。"],
  ],
} as const;
