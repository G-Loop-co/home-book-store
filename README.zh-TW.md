# Home Book Store

![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)
![Electron](https://img.shields.io/badge/Electron-desktop-47848f.svg)
![SQLite](https://img.shields.io/badge/SQLite-local-003b57.svg)

桌面版家中藏書工具。拖入書架照片，Vision AI 辨識書脊，系統用免費書籍來源補資料，最後人工確認再入庫。

**Tags:** `home-library` `desktop-app` `vision-ai` `books` `sqlite` `nextjs` `electron`

[English](./README.md)

## 使用情境

![HyperFrames 產生的書架照片到本機藏書庫流程](./docs/assets/use-case-hyperframes.png)

適合一次整理整面書架：先用照片批次辨識，再修正不確定的 AI 配對，最後把乾淨資料存進本機 SQLite。

## 重點

- 一張書架照片可匯入多本書。
- 預設 Vision provider：OpenCode Go；也支援 OpenAI。
- 書籍資料來源：Open Library、Google Books、Library of Congress、ISBN.tw、KingStone、HKBookCentre、Douban、openBD、BnF、DNB、Internet Archive，也可選填 ISBNdb、Naver Books、Rakuten Books key。
- 先進 review queue，確認後才寫入藏書庫；可進書籍頁編輯/刪除，避免 AI 誤認污染資料。
- 本機 SQLite database；desktop app 打開後會自動啟動本機 server。

## 快速開始

```bash
npm install
cp .env.example .env.local
npm run dev
```

打開 `http://localhost:3000`。

## Desktop

```bash
npm run desktop
```

打包 installer：

```bash
npm run dist:mac
npm run dist:win
```

## 設定

直接用 app 內的「設定」頁。

- 必填：目前 Vision provider 的 API key。
- 選填：Google Books API key。
- 選填 keyed metadata source：ISBNdb、Naver Books、Rakuten Books；未填 key 時不會啟用。
- 進階：base URL、model、max tokens。

不要 commit `.env.local`、API key、`.data/`、`public/uploads/`、`dist/`。

## 驗證

```bash
npm test
npm run typecheck
npm run build
```

## 授權

MIT。見 [LICENSE](./LICENSE)。
