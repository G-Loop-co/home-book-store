# Home Book Store

![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)
![Electron](https://img.shields.io/badge/Electron-desktop-47848f.svg)
![SQLite](https://img.shields.io/badge/SQLite-local-003b57.svg)

Desktop home-library app. Drop in bookshelf photos, let Vision AI detect book spines, enrich records from free book sources, then review before import.

**Tags:** `home-library` `desktop-app` `vision-ai` `books` `sqlite` `nextjs` `electron`

[繁體中文](./README.zh-TW.md)

## Preview

![Home Book Store import preview](./docs/assets/readme-preview.png)

## Use Case

![Shelf photo to local library workflow generated with HyperFrames](./docs/assets/use-case-hyperframes.png)

Use Home Book Store when you need to bulk catalog home shelves, clean up uncertain AI matches, and keep the final library private on your own machine.

Animated HyperFrames version: [use-case-hyperframes.mp4](./docs/assets/use-case-hyperframes.mp4)

## Main Points

- Import many books from one shelf photo.
- Default Vision provider: OpenCode Go. OpenAI is also supported.
- Book metadata lookup: Open Library, Google Books, Library of Congress, ISBN.tw, KingStone, HKBookCentre, Douban, openBD, BnF, DNB, Internet Archive, plus optional keyed ISBNdb, Naver Books, and Rakuten Books.
- Manual review before saving, with edit/delete support, so AI mistakes do not pollute your library.
- Local SQLite database. Desktop app starts its own local server automatically.

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Desktop

```bash
npm run desktop
```

Build installers:

```bash
npm run dist:mac
npm run dist:win
```

## Settings

Use the in-app Settings page.

- Required: Vision API key for the selected provider.
- Optional: Google Books API key.
- Optional keyed metadata sources: ISBNdb, Naver Books, Rakuten Books. They stay disabled until keys are saved.
- Advanced: base URL, model, max tokens.

Do not commit `.env.local`, API keys, `.data/`, `public/uploads/`, or `dist/`.

## Validation

```bash
npm test
npm run typecheck
npm run build
```

## License

MIT. See [LICENSE](./LICENSE).
