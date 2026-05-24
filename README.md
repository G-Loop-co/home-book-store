# Home Book Store

Private desktop-first home library manager. Upload bookshelf photos, let Vision AI detect multiple book spines, enrich book records from free public sources, then review everything manually before importing into your library.

[繁體中文 README](./README.zh-TW.md)

## Features

- Bookshelf photo import with drag-and-drop and image preview.
- Vision AI spine detection with OpenCode Go as the default provider, plus OpenAI fallback.
- Review queue before import: edit title, author, publisher, ISBN, import, or skip.
- Cross-source metadata lookup: Open Library, Google Books, ISBN.tw, KingStone, HKBookCentre, Douban, and Internet Archive.
- Duplicate detection: exact ISBN matching first, then normalized title + author matching.
- Desktop settings page: API keys, base URL, model, max tokens, and Google Books key can be edited inside the app.

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open:

```text
http://localhost:3000
```

## Settings

For normal desktop use, open the in-app Settings page:

- Required: API key for the selected Vision provider.
- Optional: Google Books API key. Leave it empty if you only want free public lookups.
- Advanced: base URL, model, and max tokens. These usually do not need changes.

`.env.local` is still supported as a fallback:

```bash
VISION_PROVIDER=opencode-go
OPENCODE_GO_API_KEY=your OpenCode Go API key
OPENCODE_GO_BASE_URL=https://opencode.ai/zen/go/v1
OPENCODE_GO_VISION_MODEL=mimo-v2.5
OPENCODE_GO_MAX_TOKENS=2000

OPENAI_API_KEY=
OPENAI_VISION_MODEL=gpt-4.1-mini
GOOGLE_BOOKS_API_KEY=
HOME_BOOK_STORE_DB_PATH=.data/home-book-store.sqlite
```

Legacy `BOOK_STORE_*` environment variables are still accepted for local migration.

## Desktop App

Development mode:

```bash
npm run desktop
```

Build installers:

```bash
npm run dist:mac
npm run dist:win
```

Artifacts are written to `dist/`:

- macOS Apple Silicon: `dist/Home Book Store-0.1.0-arm64.dmg`
- Windows x64: `dist/Home Book Store Setup 0.1.0.exe`

The desktop app stores its database and uploaded images in the system app data directory, not in the installation directory.

Uninstall:

- macOS: delete `Home Book Store.app`; to remove all data, delete `~/Library/Application Support/Home Book Store`
- Windows: use "Add or remove programs"; settings and library data are kept by default to avoid accidental data loss

## Validation

```bash
npm test
npm run typecheck
npm run build
```

## Privacy And Safety

This repository is public. Do not commit:

- `.env.local`
- API keys
- `.data/`
- `public/uploads/`
- `dist/`

Vision analysis sends uploaded images to the configured Vision provider.

## Notes

- OpenCode Go uses the chat completions endpoint: `https://opencode.ai/zen/go/v1/chat/completions`.
- Metadata sources currently use free public endpoints or HTML scraping.
