export type ImportBatchStatus =
  | "uploaded"
  | "analyzing"
  | "needs_key"
  | "needs_review"
  | "failed"
  | "complete";

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

export type VisionProviderName = "opencode-go" | "openai";

export interface AppSettings {
  visionProvider: VisionProviderName;
  visionApiKey: string;
  opencodeGoApiKey: string;
  opencodeGoBaseUrl: string;
  opencodeGoVisionModel: string;
  opencodeGoMaxTokens: string;
  openaiApiKey: string;
  openaiVisionModel: string;
  googleBooksApiKey: string;
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
    | "isbn_tw"
    | "kingstone"
    | "hkbookcentre"
    | "douban"
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

export interface ImportBatch {
  id: string;
  status: ImportBatchStatus;
  imagePaths: string[];
  imageCount: number;
  errorMessage: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface ImportBatchDetail {
  batch: ImportBatch;
  items: ImportItem[];
}
