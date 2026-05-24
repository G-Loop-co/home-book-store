export type ImportBatchStatus =
  | "uploaded"
  | "analyzing"
  | "needs_key"
  | "needs_retry"
  | "needs_review"
  | "failed"
  | "complete";

export type ImportBatchImageStatus = "pending" | "analyzing" | "succeeded" | "failed";

export type ImportItemStatus =
  | "pending_lookup"
  | "needs_review"
  | "confirmed"
  | "duplicate"
  | "rejected";

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisionBook {
  title: string;
  author: string;
  publisher: string;
  language: string;
  spineText: string;
  isbn: string;
  bbox: BBox;
  confidence: number;
  notes: string;
}

export interface VisionResult {
  books: VisionBook[];
}

export type VisionProviderName = "opencode-go" | "openai" | "grok" | "gemini" | "claude";
export type UiLanguage =
  | "zh-Hant"
  | "zh-Hans"
  | "en"
  | "ja"
  | "ko"
  | "es"
  | "fr"
  | "de"
  | "pt"
  | "ar"
  | "hi";

export interface AppSettings {
  uiLanguage: UiLanguage;
  visionProvider: VisionProviderName;
  visionApiKey: string;
  opencodeGoApiKey: string;
  opencodeGoBaseUrl: string;
  opencodeGoVisionModel: string;
  opencodeGoMaxTokens: string;
  openaiApiKey: string;
  openaiVisionModel: string;
  grokApiKey: string;
  grokBaseUrl: string;
  grokVisionModel: string;
  grokMaxTokens: string;
  geminiApiKey: string;
  geminiVisionModel: string;
  geminiMaxTokens: string;
  claudeApiKey: string;
  claudeVisionModel: string;
  claudeMaxTokens: string;
  googleBooksApiKey: string;
  isbndbApiKey: string;
  naverClientId: string;
  naverClientSecret: string;
  rakutenApplicationId: string;
  rakutenAccessKey: string;
}

export interface MetadataCandidate {
  id: string;
  title: string;
  authors: string[];
  publisher: string;
  publishedDate: string;
  isbn10: string;
  isbn13: string;
  coverUrl: string;
  description: string;
  source:
    | "open_library"
    | "google_books"
    | "isbn_db"
    | "naver_books"
    | "rakuten_books"
    | "library_of_congress"
    | "isbn_tw"
    | "kingstone"
    | "hkbookcentre"
    | "douban"
    | "openbd"
    | "bnf"
    | "dnb"
    | "internet_archive"
    | "manual";
  sourceId: string;
  score: number;
  ownedBookId?: string;
}

export interface Book {
  id: string;
  title: string;
  authors: string[];
  publisher: string;
  publishedDate: string;
  isbn10: string;
  isbn13: string;
  coverUrl: string;
  description: string;
  source: string;
  sourceId: string;
  normalizedKey: string;
  ownedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryExportRow {
  bookId: string;
  title: string;
  authors: string[];
  publisher: string;
  publishedDate: string;
  isbn10: string;
  isbn13: string;
  coverUrl: string;
  description: string;
  source: string;
  sourceId: string;
  normalizedKey: string;
  bookCreatedAt: string;
  bookUpdatedAt: string;
  copyId: string;
  copyStatus: string;
  location: string;
  notes: string;
  acquiredAt: string;
  copyCreatedAt: string;
}

export interface LibraryImportRow {
  copyId: string;
  title: string;
  authors: string[];
  publisher: string;
  publishedDate: string;
  isbn10: string;
  isbn13: string;
  coverUrl: string;
  description: string;
  source: string;
  sourceId: string;
  location: string;
  notes: string;
  acquiredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryImportSummary {
  rows: number;
  createdBooks: number;
  mergedBooks: number;
  createdCopies: number;
  skippedCopies: number;
  errors: Array<{ row: number; message: string }>;
}

export interface ImportBatch {
  id: string;
  status: ImportBatchStatus;
  imagePaths: string[];
  imageCount: number;
  errorMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportBatchImage {
  batchId: string;
  imagePath: string;
  status: ImportBatchImageStatus;
  attempts: number;
  errorMessage: string;
  lastAttemptAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportItem {
  id: string;
  batchId: string;
  imagePath: string;
  cropPath: string;
  bbox: BBox | null;
  spineText: string;
  aiExtractedJson: VisionBook | null;
  metadataCandidates: MetadataCandidate[];
  confidence: number;
  status: ImportItemStatus;
  chosenBookId: string;
  errorMessage: string;
  lookupAttempts: number;
  lastLookupAttemptAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportBatchDetail {
  batch: ImportBatch;
  images: ImportBatchImage[];
  items: ImportItem[];
}
