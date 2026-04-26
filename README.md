# md2pdf

Markdown をブラウザ上で PDF 向けにプレビューし、ブラウザの印刷機能から PDF 保存できる Vite + React + TypeScript アプリです。

## Features

- Markdown の貼り付けと `.md` ファイル読み込み
- Mermaid fenced code block の SVG プレビュー
- 画像と Mermaid ブロックのページ分割回避
- 横長の画像/Mermaid を要素ごとに回転
- A4 portrait のページプレビュー
- 本文/見出しフォント、サイズ、行間、見出しスタイル、アクセント色の調整

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run lint
npm run build
```

ビルド成果物は `dist/` に出力されます。静的ファイルとして配信できるため、Vercel、Netlify、Cloudflare Pages などにデプロイできます。

## Promotion Video

Remotion で 1920x1080 / 30fps / 30秒のプロモーション動画を生成できます。

```bash
npm run video:studio
npm run video:still
npm run video:render
```

`video:still` は `out/md2pdf-promo-frame.png`、`video:render` は `out/md2pdf-promo.mp4` を出力します。

## PDF Export

アプリ内で直接 PDF ファイルを生成するのではなく、`PDFプレビュー / 出力` ボタンからブラウザの印刷プレビューを開き、保存先として PDF を選びます。
