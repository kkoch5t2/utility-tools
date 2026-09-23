# 無料Web便利ツール集

日本向けの、無料・登録不要・ブラウザ内処理を原則としたWeb便利ツール集です。100種類以上の画像・CSV・JSON・PDF・動画・テキスト・開発者向けツールなどを提供しています。

## 必要環境

- Node.js 22.12 以上（開発確認環境: Node.js 24）
- npm
- Windows PowerShell を想定

## セットアップ

```powershell
cd C:\Users\chiba\Sites\utility-tools
npm install
npm run dev
```

ブラウザで `http://localhost:4321` を開きます。

## 品質確認

```powershell
npm run check
npm test
npm run build
npm run test:e2e
```

Playwright の Chromium が未導入なら最初に以下を実行します。

```powershell
npx playwright install chromium
```

## 現在の実装

- 共通ヘッダー・フッター・ツールレイアウト
- ツール定義レジストリ
- レスポンシブなトップページ
- 画像一括リサイズ・圧縮・WebP/JPEG/PNG変換
- CSV分割（UTF-8 / BOM付きUTF-8、ヘッダー引き継ぎ、クォート内カンマ・改行・エスケープクォート対応）
- テキスト重複行削除（最初/最後を残す、空行・空白・大小文字、元順/並べ替え、コピー・TXT保存）
- ドラッグ＆ドロップ、複数選択、重複選択除外
- 最大100枚、1枚25MB、合計250MBの入力制限
- 長辺・横幅・高さ指定、アスペクト比維持、拡大可否
- JPEG背景色、品質、接尾辞、同名回避
- 逐次処理、進捗表示、キャンセル
- 個別ダウンロード、ZIP一括ダウンロード
- 日本語エラー、1ファイル失敗時の継続
- Unit Test、Chromium E2E、GitHub Actions CI

## ディレクトリ方針

`src/core` はツール共通処理、`src/engines` はカテゴリ別処理、`src/tools` は個別ツール設定です。ページはこれらを組み合わせるだけにし、新しいツールで共通UIや基盤をコピーしない構成にしています。

## ブラウザ内処理の原則

画像ファイルは File API / createImageBitmap / Canvas でブラウザ内処理します。ファイルアップロードAPI、DB、サーバー側ファイル処理はありません。Canvasで再エンコードするため、EXIF等のメタデータは原則出力に残りません。createImageBitmap の `imageOrientation: "from-image"` を使用し、EXIF Orientation を反映して読み込みます。

## 採用ライブラリ

- Astro: 静的ページと必要箇所だけのクライアントJavaScriptに適しているため
- JSZip: 複数結果のブラウザ内ZIP生成に使用
- Papa Parse: CSVを単純な改行分割にせず、クォート仕様を正しく解析しつつチャンク読み込みするため
- Vitest: 純粋関数のUnit Test
- Playwright: 主要操作フローのChromium E2E
- @astrojs/check / TypeScript: Astroテンプレートとクライアントコードの型検査

画像のリサイズ・エンコード自体は追加ライブラリを使わずブラウザ標準APIで行います。

## Cloudflare Workers

本番URLは `https://utility-tools-jp.com` です。Cloudflare Workers Static Assets で `dist` を配信し、canonical / OGP / sitemap もこの正式ドメインに固定しています。デプロイは `npm run build` の後に `npx wrangler deploy` で行います。

## 新しいツールの追加方法

1. `src/tools/<tool>/config.ts` に個別設定を作る
2. 必要なら `src/engines/<category>/` に再利用可能な処理を追加する
3. `src/config/tools.ts` にツールを登録する
4. `src/pages/` に薄いページを作り、共通レイアウトを利用する
5. Unit Test と主要E2Eを追加する

## 現時点の制限

- Shift_JIS、PDF系は未対応
- 画像処理は逐次実行でメモリピークを抑制しているが、単一画像のCanvas処理はメインスレッドで行う
- 40MPを超える画像は安全側に倒して拒否する
