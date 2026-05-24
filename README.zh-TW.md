# Home Book Store

本機私用、桌面優先的家中藏書管理工具。上傳書架照片後，Vision AI 會辨識多本書脊，系統再用多個免費來源補書籍 metadata，最後經人工確認才匯入藏書庫。

[English README](./README.md)

## 功能

- 書架照片匯入：支援拖放與圖片預覽。
- Vision AI 書脊辨識：預設 OpenCode Go，也保留 OpenAI fallback。
- 人工確認佇列：可修改書名、作者、出版社、ISBN，再匯入或略過。
- Cross-source metadata：Open Library、Google Books、ISBN.tw、KingStone、HKBookCentre、Douban、Internet Archive。
- Duplicate detection：ISBN 精準比對；沒有 ISBN 時用 normalized title + author 比對。
- Desktop settings：API key、base URL、model、max tokens、Google Books key 都可在 app 內設定。

## 本機開發

```bash
npm install
cp .env.example .env.local
npm run dev
```

開發網址：

```text
http://localhost:3000
```

## 設定

一般桌面使用只需要打開 app 的「設定」頁：

- 必填：目前 Vision provider 的 API key。
- 選填：Google Books API key；留空也會查其他免費來源。
- 進階：base URL、model、max tokens，通常不用改。

`.env.local` 仍可作為 fallback：

```bash
VISION_PROVIDER=opencode-go
OPENCODE_GO_API_KEY=你的 OpenCode Go API key
OPENCODE_GO_BASE_URL=https://opencode.ai/zen/go/v1
OPENCODE_GO_VISION_MODEL=mimo-v2.5
OPENCODE_GO_MAX_TOKENS=2000

OPENAI_API_KEY=
OPENAI_VISION_MODEL=gpt-4.1-mini
GOOGLE_BOOKS_API_KEY=
HOME_BOOK_STORE_DB_PATH=.data/home-book-store.sqlite
```

舊的 `BOOK_STORE_*` 環境變數仍可用，方便本機舊設定過渡。

## Desktop App

開發模式：

```bash
npm run desktop
```

打包：

```bash
npm run dist:mac
npm run dist:win
```

產物會輸出到 `dist/`：

- macOS Apple Silicon: `dist/Home Book Store-0.1.0-arm64.dmg`
- Windows x64: `dist/Home Book Store Setup 0.1.0.exe`

Desktop app 會把資料庫與上傳圖片放在系統 app data 目錄，不寫入安裝目錄。

移除：

- macOS：刪除 `Home Book Store.app`；如要清資料，再刪除 `~/Library/Application Support/Home Book Store`
- Windows：用「新增或移除程式」解除安裝；設定與資料預設會保留，避免誤刪藏書庫

## 驗證

```bash
npm test
npm run typecheck
npm run build
```

## 隱私與安全

這個 repository 是公開的。不要 commit：

- `.env.local`
- API key
- `.data/`
- `public/uploads/`
- `dist/`

Vision 分析會把上傳圖片送到你設定的 Vision provider。

## Notes

- OpenCode Go 使用 chat completions endpoint：`https://opencode.ai/zen/go/v1/chat/completions`。
- metadata 來源目前走免費 public endpoint 或 HTML scrape。
