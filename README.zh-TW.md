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
- 預設 Vision provider：OpenCode Go；也支援 OpenAI、Grok、Gemini、Claude。只要所選 model 支援 vision，就可用來分析書架照片。
- 支援 CSV 匯入/匯出藏書與副本備註/位置，方便搬到另一台電腦或重建本機 SQLite database。
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

用新版 `.dmg` 或 `.exe` 覆蓋既有安裝會更新程式，但不會刪除本機資料。SQLite database、uploads、settings 都存在作業系統的 user-data folder，不在 app bundle 裡。Windows installer 也設定為 uninstall 時不刪 app data；只有在你確定要清空藏書庫時，才手動刪除該資料夾。

Desktop app 也會維持單一執行實例，避免更新或重開時同時啟動兩個 local server 寫同一個 SQLite database。

## CSV 備份與還原

在「藏書」頁使用按鈕：

- **匯出 CSV**：下載已擁有藏書，包含作者、ISBN、書籍 metadata、副本位置、備註、取得日期。
- **匯入 CSV**：把這些書與副本還原到目前 SQLite database。

CSV 匯入會先用 ISBN 配對既有書籍，再用正規化後的書名/作者配對。同一份 CSV 重複匯入時，完全相同的副本會略過，不會增加多餘 owned count。API key、settings、uploads、import history 不會放進 CSV；若要完整機器備份，請備份 app data folder。

## 設定

直接用 app 內的「設定」頁。

- 必填：目前 Vision provider 的 API key。
- 支援 Vision provider：OpenCode Go、OpenAI、Grok、Gemini、Claude。
- 選填：Google Books API key。
- 選填 keyed metadata source：ISBNdb、Naver Books、Rakuten Books；未填 key 時不會啟用。
- 進階：base URL、model、max tokens。

Grok、Gemini、Claude 請選用支援圖片輸入的 model。Provider API key 只會在該 provider 被選中時使用。

## 可繼續的批次匯入

批次照片匯入會替每張圖片保存 checkpoint。如果網路或 provider 錯誤中斷分析，回到 review batch 按 **繼續分析**；已完成圖片會跳過，只會重跑 pending 或 failed 圖片。Metadata lookup 失敗也會保留在該 item 上，可重試而不會丟失手動修正。

不要 commit `.env.local`、API key、`.data/`、`public/uploads/`、`dist/`。

## 驗證

```bash
npm test
npm run typecheck
npm run build
```

## 授權

MIT。見 [LICENSE](./LICENSE)。
