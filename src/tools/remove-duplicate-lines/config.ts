export const removeDuplicateLinesConfig = {
  id: "remove-duplicate-lines",
  name: "テキスト重複行削除",
  category: "テキスト",
  href: "/text/remove-duplicates/",
  title: "テキスト重複行削除ツール｜無料・登録不要",
  description: "重複した行を条件指定で削除します。貼り付けたテキストやTXT・LOG・CSVファイルをブラウザ内だけで処理します。",
  maxFileBytes: 20 * 1024 * 1024,
  faqs: [
    ["最初と最後のどちらの重複行を残せますか？", "どちらも選べます。最初の出現を残すか、最後の出現を残すかを指定できます。"],
    ["前後の空白や大文字・小文字を無視できますか？", "はい。比較時に前後の空白を無視する設定と、大文字・小文字を区別する設定を切り替えられます。"],
    ["入力したテキストは送信されますか？", "いいえ。重複判定、コピー、TXT生成までブラウザ内で処理します。"],
  ],
} as const;
