import type { UiLanguage } from "@/lib/types";

export const DEFAULT_UI_LANGUAGE: UiLanguage = "zh-Hant";

export const SUPPORTED_UI_LANGUAGES: Array<{
  code: UiLanguage;
  label: string;
  nativeLabel: string;
  dir: "ltr" | "rtl";
}> = [
  { code: "zh-Hant", label: "Traditional Chinese", nativeLabel: "繁體中文", dir: "ltr" },
  { code: "zh-Hans", label: "Simplified Chinese", nativeLabel: "简体中文", dir: "ltr" },
  { code: "en", label: "English", nativeLabel: "English", dir: "ltr" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語", dir: "ltr" },
  { code: "ko", label: "Korean", nativeLabel: "한국어", dir: "ltr" },
  { code: "es", label: "Spanish", nativeLabel: "Español", dir: "ltr" },
  { code: "fr", label: "French", nativeLabel: "Français", dir: "ltr" },
  { code: "de", label: "German", nativeLabel: "Deutsch", dir: "ltr" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português", dir: "ltr" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", dir: "ltr" }
];

const supportedCodes = new Set<UiLanguage>(SUPPORTED_UI_LANGUAGES.map((language) => language.code));

export function normalizeUiLanguage(value: string | undefined): UiLanguage {
  return supportedCodes.has(value as UiLanguage) ? (value as UiLanguage) : DEFAULT_UI_LANGUAGE;
}

export function languageDirection(language: UiLanguage): "ltr" | "rtl" {
  return SUPPORTED_UI_LANGUAGES.find((entry) => entry.code === language)?.dir ?? "ltr";
}

const zhHant = {
  appName: "Home Book Store",
  navLibrary: "藏書",
  navImport: "匯入",
  navSettings: "設定",
  loading: "載入中",
  save: "儲存",
  saving: "儲存中",
  back: "返回",
  backToLibrary: "返回藏書",
  edit: "編輯",
  cancel: "取消",
  delete: "刪除",
  required: "必填",
  optional: "選填",
  useDefaults: "使用預設值",
  libraryEyebrow: "Library",
  libraryTitle: "家中藏書",
  importPhotos: "匯入照片",
  searchLibraryAria: "搜尋藏書",
  searchLibraryPlaceholder: "搜尋書名、作者、ISBN、簡介",
  bookCount: "{count} 本",
  noBooks: "未有藏書",
  libraryReadFailed: "藏書讀取失敗",
  authorUnknown: "作者未明",
  publishUnknown: "出版資料未明",
  isbnUnknown: "ISBN 未明",
  owned: "已擁有",
  copyCount: "{count} 本副本",
  importEyebrow: "Import",
  importTitle: "匯入書架照片",
  imagesOnlyError: "只可加入圖片檔",
  noImagesSelected: "未選擇圖片",
  uploadFailed: "上傳失敗",
  uploadImagesFirst: "先上傳圖片",
  prepareVision: "準備送出 Vision 分析",
  visionReading: "Vision 正在閱讀書脊",
  crossSourceLookup: "Cross-source 正在查資料",
  analysisComplete: "分析完成，前往確認頁",
  visionFailed: "Vision 分析失敗",
  dropImages: "拖放書架圖片",
  chooseImages: "選擇圖片",
  previewTitle: "圖片預覽",
  selectedImagesStats: "{count} 張 · {kb} KB",
  noImages: "未選圖片",
  removeImage: "移除圖片",
  importProgressAria: "匯入進度",
  visionAnalyze: "Vision 分析",
  analyzing: "分析中",
  reviewEyebrow: "Review",
  reviewTitle: "確認匯入",
  statusPendingLookup: "待查資料",
  statusNeedsReview: "待確認",
  statusConfirmed: "已匯入",
  statusDuplicate: "已擁有",
  statusRejected: "已略過",
  batchReadFailed: "批次讀取失敗",
  metadataLookupFailed: "資料查詢失敗",
  noMetadataToLookup: "沒有待查資料",
  autoLookup: "自動查資料",
  lookupAll: "查全部資料",
  crossSourceLookupBook: "Cross-source 查資料：{title}",
  lookupComplete: "資料查詢完成",
  lookupFailures: "{count} 本查資料失敗，已保留手動欄位",
  titleRequired: "書名不可留空",
  importFailed: "匯入失敗",
  rejectFailed: "略過失敗",
  refresh: "重新整理",
  lookupProgressAria: "資料查詢進度",
  noSpines: "未辨識到書脊",
  bookshelfPhotoAlt: "書架照片",
  unnamed: "未命名",
  titleField: "書名",
  authorField: "作者",
  publisherField: "出版社",
  isbnField: "ISBN",
  descriptionField: "簡介",
  useManualFields: "使用手動欄位",
  lookupMetadata: "查資料",
  importBook: "匯入",
  skip: "略過",
  bookEyebrow: "Book",
  bookReadFailed: "藏書讀取失敗",
  bookUpdateFailed: "藏書更新失敗",
  bookDeleteFailed: "藏書刪除失敗",
  deleteConfirm: "刪除「{title}」？",
  bookNotFound: "找不到藏書",
  bookTitleRequired: "書名不可留空",
  fieldTitle: "書名",
  fieldAuthors: "作者",
  fieldPublisher: "出版社",
  fieldPublishedDate: "出版日期",
  fieldIsbn10: "ISBN-10",
  fieldIsbn13: "ISBN-13",
  fieldCoverUrl: "封面 URL",
  fieldDescription: "簡介",
  authorsLabel: "作者",
  publishingLabel: "出版",
  isbnLabel: "ISBN",
  sourceLabel: "來源",
  descriptionHeading: "簡介",
  noDescription: "未有簡介",
  manualSource: "手動",
  settingsEyebrow: "Settings",
  settingsTitle: "設定",
  settingsReadFailed: "設定讀取失敗",
  settingsSaveFailed: "設定儲存失敗",
  settingsSaved: "已儲存設定",
  settingsSummaryVision: "目前 Vision",
  keyReady: "已填 key",
  keyNeeded: "需要 API key",
  languageSectionTitle: "介面語言",
  uiLanguage: "語言",
  chooseLanguageHelp: "切換後整個介面會使用此語言。書籍資料本身不會翻譯。",
  visionProviderTitle: "選擇 Vision provider",
  recommended: "建議",
  opencodeHelp: "填 OpenCode Go API key 即可。base URL 與 model 已預設。",
  openaiHelp: "只有改用 OpenAI Vision 時才需要填。",
  apiKeyTitle: "必填：{provider} API key",
  opencodeApiKeyHelp: "用 OpenCode Go / opencode.ai vision 時只需要這個 key。",
  openaiApiKeyHelp: "只有 provider 選 OpenAI 時會使用。",
  googleBooksTitle: "選填：Google Books",
  googleBooksPlaceholder: "可留空",
  googleBooksHelp: "留空也會查 Open Library、ISBN.tw、KingStone、HKBookCentre、Douban、Internet Archive。",
  advancedSettings: "進階設定",
  opencodeBaseHelp: "預設可用，不改也可以。",
  opencodeModelHelp: "預設 mimo-v2.5。",
  maxTokensHelp: "書很多或回傳 JSON 被截斷時才需要加大。",
  fallbackVisionKey: "Fallback Vision API key",
  fallbackVisionPlaceholder: "通常不用填",
  fallbackVisionHelp: "只有 OpenCode Go key 留空時才會用。",
  openaiModelHelp: "預設 gpt-4.1-mini。"
} as const;

type I18nKey = keyof typeof zhHant;
export type Translate = (key: I18nKey, variables?: Record<string, string | number>) => string;

const dictionaries: Record<UiLanguage, Partial<Record<I18nKey, string>>> = {
  "zh-Hant": zhHant,
  "zh-Hans": {
    appName: "Home Book Store", navLibrary: "藏书", navImport: "导入", navSettings: "设置", loading: "加载中", save: "保存", saving: "保存中", back: "返回", backToLibrary: "返回藏书", edit: "编辑", cancel: "取消", delete: "删除", required: "必填", optional: "选填", useDefaults: "使用默认值",
    libraryEyebrow: "Library", libraryTitle: "家中藏书", importPhotos: "导入照片", searchLibraryAria: "搜索藏书", searchLibraryPlaceholder: "搜索书名、作者、ISBN、简介", bookCount: "{count} 本", noBooks: "暂无藏书", libraryReadFailed: "藏书读取失败", authorUnknown: "作者未知", publishUnknown: "出版资料未知", isbnUnknown: "ISBN 未知", owned: "已拥有", copyCount: "{count} 本副本",
    importEyebrow: "Import", importTitle: "导入书架照片", imagesOnlyError: "只能加入图片文件", noImagesSelected: "未选择图片", uploadFailed: "上传失败", uploadImagesFirst: "先上传图片", prepareVision: "准备提交 Vision 分析", visionReading: "Vision 正在读取书脊", crossSourceLookup: "Cross-source 正在查资料", analysisComplete: "分析完成，前往确认页", visionFailed: "Vision 分析失败", dropImages: "拖放书架图片", chooseImages: "选择图片", previewTitle: "图片预览", selectedImagesStats: "{count} 张 · {kb} KB", noImages: "未选图片", removeImage: "移除图片", importProgressAria: "导入进度", visionAnalyze: "Vision 分析", analyzing: "分析中",
    reviewEyebrow: "Review", reviewTitle: "确认导入", statusPendingLookup: "待查资料", statusNeedsReview: "待确认", statusConfirmed: "已导入", statusDuplicate: "已拥有", statusRejected: "已略过", batchReadFailed: "批次读取失败", metadataLookupFailed: "资料查询失败", noMetadataToLookup: "没有待查资料", autoLookup: "自动查资料", lookupAll: "查全部资料", crossSourceLookupBook: "Cross-source 查资料：{title}", lookupComplete: "资料查询完成", lookupFailures: "{count} 本查资料失败，已保留手动栏位", titleRequired: "书名不可留空", importFailed: "导入失败", rejectFailed: "略过失败", refresh: "刷新", lookupProgressAria: "资料查询进度", noSpines: "未识别到书脊", bookshelfPhotoAlt: "书架照片", unnamed: "未命名", titleField: "书名", authorField: "作者", publisherField: "出版社", isbnField: "ISBN", descriptionField: "简介", useManualFields: "使用手动栏位", lookupMetadata: "查资料", importBook: "导入", skip: "略过",
    bookEyebrow: "Book", bookReadFailed: "藏书读取失败", bookUpdateFailed: "藏书更新失败", bookDeleteFailed: "藏书删除失败", deleteConfirm: "删除「{title}」？", bookNotFound: "找不到藏书", bookTitleRequired: "书名不可留空", fieldTitle: "书名", fieldAuthors: "作者", fieldPublisher: "出版社", fieldPublishedDate: "出版日期", fieldIsbn10: "ISBN-10", fieldIsbn13: "ISBN-13", fieldCoverUrl: "封面 URL", fieldDescription: "简介", authorsLabel: "作者", publishingLabel: "出版", isbnLabel: "ISBN", sourceLabel: "来源", descriptionHeading: "简介", noDescription: "暂无简介", manualSource: "手动",
    settingsEyebrow: "Settings", settingsTitle: "设置", settingsReadFailed: "设置读取失败", settingsSaveFailed: "设置保存失败", settingsSaved: "已保存设置", settingsSummaryVision: "当前 Vision", keyReady: "已填 key", keyNeeded: "需要 API key", languageSectionTitle: "界面语言", uiLanguage: "语言", chooseLanguageHelp: "切换后整个界面会使用此语言。书籍资料本身不会翻译。", visionProviderTitle: "选择 Vision provider", recommended: "建议", opencodeHelp: "填写 OpenCode Go API key 即可。base URL 与 model 已预设。", openaiHelp: "只有改用 OpenAI Vision 时才需要填写。", apiKeyTitle: "必填：{provider} API key", opencodeApiKeyHelp: "使用 OpenCode Go / opencode.ai vision 时只需要这个 key。", openaiApiKeyHelp: "只有 provider 选 OpenAI 时会使用。", googleBooksTitle: "选填：Google Books", googleBooksPlaceholder: "可留空", googleBooksHelp: "留空也会查 Open Library、ISBN.tw、KingStone、HKBookCentre、Douban、Internet Archive。", advancedSettings: "高级设置", opencodeBaseHelp: "默认可用，不改也可以。", opencodeModelHelp: "默认 mimo-v2.5。", maxTokensHelp: "书很多或返回 JSON 被截断时才需要加大。", fallbackVisionKey: "Fallback Vision API key", fallbackVisionPlaceholder: "通常不用填", fallbackVisionHelp: "只有 OpenCode Go key 留空时才会用。", openaiModelHelp: "默认 gpt-4.1-mini。"
  },
  en: {
    appName: "Home Book Store", navLibrary: "Library", navImport: "Import", navSettings: "Settings", loading: "Loading", save: "Save", saving: "Saving", back: "Back", backToLibrary: "Back to library", edit: "Edit", cancel: "Cancel", delete: "Delete", required: "Required", optional: "Optional", useDefaults: "Use defaults",
    libraryEyebrow: "Library", libraryTitle: "Home library", importPhotos: "Import photos", searchLibraryAria: "Search library", searchLibraryPlaceholder: "Search title, author, ISBN, description", bookCount: "{count} books", noBooks: "No books yet", libraryReadFailed: "Failed to load library", authorUnknown: "Unknown author", publishUnknown: "Unknown publishing info", isbnUnknown: "Unknown ISBN", owned: "Owned", copyCount: "{count} copies",
    importEyebrow: "Import", importTitle: "Import bookshelf photos", imagesOnlyError: "Only image files can be added", noImagesSelected: "No images selected", uploadFailed: "Upload failed", uploadImagesFirst: "Upload images first", prepareVision: "Preparing Vision analysis", visionReading: "Vision is reading book spines", crossSourceLookup: "Cross-source metadata lookup", analysisComplete: "Analysis complete, opening review", visionFailed: "Vision analysis failed", dropImages: "Drop bookshelf images", chooseImages: "Choose images", previewTitle: "Image preview", selectedImagesStats: "{count} files · {kb} KB", noImages: "No images selected", removeImage: "Remove image", importProgressAria: "Import progress", visionAnalyze: "Vision analysis", analyzing: "Analyzing",
    reviewEyebrow: "Review", reviewTitle: "Confirm import", statusPendingLookup: "Pending lookup", statusNeedsReview: "Needs review", statusConfirmed: "Imported", statusDuplicate: "Owned", statusRejected: "Skipped", batchReadFailed: "Failed to load batch", metadataLookupFailed: "Metadata lookup failed", noMetadataToLookup: "No metadata to look up", autoLookup: "Auto lookup", lookupAll: "Look up all", crossSourceLookupBook: "Cross-source lookup: {title}", lookupComplete: "Metadata lookup complete", lookupFailures: "{count} lookups failed; manual fields were kept", titleRequired: "Title is required", importFailed: "Import failed", rejectFailed: "Skip failed", refresh: "Refresh", lookupProgressAria: "Metadata lookup progress", noSpines: "No book spines detected", bookshelfPhotoAlt: "Bookshelf photo", unnamed: "Untitled", titleField: "Title", authorField: "Author", publisherField: "Publisher", isbnField: "ISBN", descriptionField: "Description", useManualFields: "Use manual fields", lookupMetadata: "Look up", importBook: "Import", skip: "Skip",
    bookEyebrow: "Book", bookReadFailed: "Failed to load book", bookUpdateFailed: "Failed to update book", bookDeleteFailed: "Failed to delete book", deleteConfirm: "Delete \"{title}\"?", bookNotFound: "Book not found", bookTitleRequired: "Title is required", fieldTitle: "Title", fieldAuthors: "Authors", fieldPublisher: "Publisher", fieldPublishedDate: "Published date", fieldIsbn10: "ISBN-10", fieldIsbn13: "ISBN-13", fieldCoverUrl: "Cover URL", fieldDescription: "Description", authorsLabel: "Authors", publishingLabel: "Publishing", isbnLabel: "ISBN", sourceLabel: "Source", descriptionHeading: "Description", noDescription: "No description", manualSource: "Manual",
    settingsEyebrow: "Settings", settingsTitle: "Settings", settingsReadFailed: "Failed to load settings", settingsSaveFailed: "Failed to save settings", settingsSaved: "Settings saved", settingsSummaryVision: "Current Vision", keyReady: "Key set", keyNeeded: "API key needed", languageSectionTitle: "Interface language", uiLanguage: "Language", chooseLanguageHelp: "The interface will use this language. Book metadata will not be translated.", visionProviderTitle: "Choose Vision provider", recommended: "Recommended", opencodeHelp: "Use an OpenCode Go API key. Base URL and model already have defaults.", openaiHelp: "Only needed when using OpenAI Vision.", apiKeyTitle: "Required: {provider} API key", opencodeApiKeyHelp: "This is the only key needed for OpenCode Go / opencode.ai vision.", openaiApiKeyHelp: "Used only when provider is OpenAI.", googleBooksTitle: "Optional: Google Books", googleBooksPlaceholder: "Can be empty", googleBooksHelp: "When empty, the app still checks Open Library, ISBN.tw, KingStone, HKBookCentre, Douban, and Internet Archive.", advancedSettings: "Advanced settings", opencodeBaseHelp: "The default works; usually leave it unchanged.", opencodeModelHelp: "Default is mimo-v2.5.", maxTokensHelp: "Increase only when many books or truncated JSON responses need it.", fallbackVisionKey: "Fallback Vision API key", fallbackVisionPlaceholder: "Usually not needed", fallbackVisionHelp: "Used only when OpenCode Go key is empty.", openaiModelHelp: "Default is gpt-4.1-mini."
  },
  ja: {
    navLibrary: "蔵書", navImport: "インポート", navSettings: "設定", loading: "読み込み中", save: "保存", saving: "保存中", back: "戻る", backToLibrary: "蔵書へ戻る", edit: "編集", cancel: "キャンセル", delete: "削除", useDefaults: "既定値を使う",
    libraryTitle: "自宅の蔵書", importPhotos: "写真をインポート", searchLibraryPlaceholder: "書名、著者、ISBN、紹介で検索", bookCount: "{count} 冊", noBooks: "蔵書はまだありません", libraryReadFailed: "蔵書の読み込みに失敗しました", authorUnknown: "著者不明", publishUnknown: "出版情報不明", isbnUnknown: "ISBN 不明", owned: "所有済み", copyCount: "{count} 冊の複本",
    importTitle: "本棚写真をインポート", imagesOnlyError: "画像ファイルのみ追加できます", noImagesSelected: "画像が選択されていません", uploadFailed: "アップロード失敗", uploadImagesFirst: "先に画像をアップロード", prepareVision: "Vision 分析を準備中", visionReading: "Vision が背表紙を読み取り中", crossSourceLookup: "Cross-source で資料検索中", analysisComplete: "分析完了、確認画面へ移動", visionFailed: "Vision 分析に失敗しました", dropImages: "本棚画像をドロップ", chooseImages: "画像を選択", previewTitle: "画像プレビュー", selectedImagesStats: "{count} 枚 · {kb} KB", noImages: "画像未選択", removeImage: "画像を削除", visionAnalyze: "Vision 分析", analyzing: "分析中",
    reviewTitle: "インポート確認", statusPendingLookup: "検索待ち", statusNeedsReview: "確認待ち", statusConfirmed: "インポート済み", statusDuplicate: "所有済み", statusRejected: "スキップ済み", batchReadFailed: "バッチ読み込み失敗", metadataLookupFailed: "資料検索失敗", noMetadataToLookup: "検索待ち資料なし", autoLookup: "自動検索", lookupAll: "すべて検索", crossSourceLookupBook: "Cross-source 検索：{title}", lookupComplete: "資料検索完了", lookupFailures: "{count} 冊の検索に失敗、手動欄を保持しました", titleRequired: "書名は必須です", importFailed: "インポート失敗", rejectFailed: "スキップ失敗", refresh: "再読み込み", noSpines: "背表紙を検出できません", bookshelfPhotoAlt: "本棚写真", unnamed: "無題", titleField: "書名", authorField: "著者", publisherField: "出版社", descriptionField: "紹介", useManualFields: "手動欄を使用", lookupMetadata: "検索", importBook: "インポート", skip: "スキップ",
    bookReadFailed: "本の読み込みに失敗しました", bookUpdateFailed: "本の更新に失敗しました", bookDeleteFailed: "本の削除に失敗しました", deleteConfirm: "「{title}」を削除しますか？", bookNotFound: "本が見つかりません", bookTitleRequired: "書名は必須です", fieldTitle: "書名", fieldAuthors: "著者", fieldPublisher: "出版社", fieldPublishedDate: "出版日", fieldDescription: "紹介", authorsLabel: "著者", publishingLabel: "出版", sourceLabel: "ソース", descriptionHeading: "紹介", noDescription: "紹介なし", manualSource: "手動",
    settingsTitle: "設定", settingsReadFailed: "設定の読み込みに失敗しました", settingsSaveFailed: "設定の保存に失敗しました", settingsSaved: "設定を保存しました", settingsSummaryVision: "現在の Vision", keyReady: "key 設定済み", keyNeeded: "API key が必要", languageSectionTitle: "表示言語", uiLanguage: "言語", chooseLanguageHelp: "画面全体にこの言語を使います。本のメタデータは翻訳されません。", visionProviderTitle: "Vision provider を選択", recommended: "推奨", openaiHelp: "OpenAI Vision 使用時のみ必要です。", apiKeyTitle: "必須：{provider} API key", googleBooksTitle: "任意：Google Books", googleBooksPlaceholder: "空欄可", advancedSettings: "詳細設定"
  },
  ko: {
    navLibrary: "서재", navImport: "가져오기", navSettings: "설정", loading: "불러오는 중", save: "저장", saving: "저장 중", back: "뒤로", backToLibrary: "서재로 돌아가기", edit: "편집", cancel: "취소", delete: "삭제", useDefaults: "기본값 사용",
    libraryTitle: "집 서재", importPhotos: "사진 가져오기", searchLibraryPlaceholder: "제목, 저자, ISBN, 소개 검색", bookCount: "{count} 권", noBooks: "아직 책이 없습니다", libraryReadFailed: "서재를 불러오지 못했습니다", authorUnknown: "저자 미상", publishUnknown: "출판 정보 미상", isbnUnknown: "ISBN 미상", owned: "보유", copyCount: "{count} 권 복본",
    importTitle: "책장 사진 가져오기", imagesOnlyError: "이미지 파일만 추가할 수 있습니다", noImagesSelected: "이미지를 선택하지 않았습니다", uploadFailed: "업로드 실패", uploadImagesFirst: "먼저 이미지 업로드", prepareVision: "Vision 분석 준비 중", visionReading: "Vision이 책등을 읽는 중", crossSourceLookup: "Cross-source 자료 조회 중", analysisComplete: "분석 완료, 확인 화면으로 이동", visionFailed: "Vision 분석 실패", dropImages: "책장 이미지를 놓기", chooseImages: "이미지 선택", previewTitle: "이미지 미리보기", selectedImagesStats: "{count} 장 · {kb} KB", noImages: "이미지 없음", removeImage: "이미지 제거", visionAnalyze: "Vision 분석", analyzing: "분석 중",
    reviewTitle: "가져오기 확인", statusPendingLookup: "조회 대기", statusNeedsReview: "확인 필요", statusConfirmed: "가져옴", statusDuplicate: "보유", statusRejected: "건너뜀", batchReadFailed: "배치 로드 실패", metadataLookupFailed: "자료 조회 실패", noMetadataToLookup: "조회할 자료 없음", autoLookup: "자동 조회", lookupAll: "모두 조회", crossSourceLookupBook: "Cross-source 조회: {title}", lookupComplete: "자료 조회 완료", lookupFailures: "{count} 권 조회 실패, 수동 필드는 유지됨", titleRequired: "제목은 필수입니다", importFailed: "가져오기 실패", rejectFailed: "건너뛰기 실패", refresh: "새로고침", noSpines: "책등을 찾지 못했습니다", bookshelfPhotoAlt: "책장 사진", unnamed: "제목 없음", titleField: "제목", authorField: "저자", publisherField: "출판사", descriptionField: "소개", useManualFields: "수동 필드 사용", lookupMetadata: "조회", importBook: "가져오기", skip: "건너뛰기",
    bookReadFailed: "책을 불러오지 못했습니다", bookUpdateFailed: "책 업데이트 실패", bookDeleteFailed: "책 삭제 실패", deleteConfirm: "\"{title}\" 삭제?", bookNotFound: "책을 찾을 수 없습니다", bookTitleRequired: "제목은 필수입니다", fieldTitle: "제목", fieldAuthors: "저자", fieldPublisher: "출판사", fieldPublishedDate: "출판일", fieldDescription: "소개", authorsLabel: "저자", publishingLabel: "출판", sourceLabel: "출처", descriptionHeading: "소개", noDescription: "소개 없음", manualSource: "수동",
    settingsTitle: "설정", settingsReadFailed: "설정 로드 실패", settingsSaveFailed: "설정 저장 실패", settingsSaved: "설정 저장됨", settingsSummaryVision: "현재 Vision", keyReady: "key 있음", keyNeeded: "API key 필요", languageSectionTitle: "인터페이스 언어", uiLanguage: "언어", chooseLanguageHelp: "전체 인터페이스에 이 언어를 사용합니다. 책 메타데이터는 번역하지 않습니다.", visionProviderTitle: "Vision provider 선택", recommended: "추천", openaiHelp: "OpenAI Vision 사용 시에만 필요합니다.", apiKeyTitle: "필수: {provider} API key", googleBooksTitle: "선택: Google Books", googleBooksPlaceholder: "비워도 됨", advancedSettings: "고급 설정"
  },
  es: {
    navLibrary: "Biblioteca", navImport: "Importar", navSettings: "Ajustes", loading: "Cargando", save: "Guardar", saving: "Guardando", back: "Volver", backToLibrary: "Volver a biblioteca", edit: "Editar", cancel: "Cancelar", delete: "Eliminar", useDefaults: "Usar valores predeterminados",
    libraryTitle: "Biblioteca de casa", importPhotos: "Importar fotos", searchLibraryPlaceholder: "Buscar título, autor, ISBN, descripción", bookCount: "{count} libros", noBooks: "Aún no hay libros", libraryReadFailed: "No se pudo cargar la biblioteca", authorUnknown: "Autor desconocido", publishUnknown: "Datos de publicación desconocidos", isbnUnknown: "ISBN desconocido", owned: "En propiedad", copyCount: "{count} copias",
    importTitle: "Importar fotos de estantería", imagesOnlyError: "Solo se pueden añadir imágenes", noImagesSelected: "No hay imágenes seleccionadas", uploadFailed: "Error al subir", uploadImagesFirst: "Subir imágenes primero", prepareVision: "Preparando análisis Vision", visionReading: "Vision está leyendo lomos", crossSourceLookup: "Buscando metadatos en fuentes", analysisComplete: "Análisis completo, abriendo revisión", visionFailed: "Error de análisis Vision", dropImages: "Suelta imágenes de estantería", chooseImages: "Elegir imágenes", previewTitle: "Vista previa", selectedImagesStats: "{count} archivos · {kb} KB", noImages: "Sin imágenes", removeImage: "Quitar imagen", visionAnalyze: "Análisis Vision", analyzing: "Analizando",
    reviewTitle: "Confirmar importación", statusPendingLookup: "Pendiente de búsqueda", statusNeedsReview: "Necesita revisión", statusConfirmed: "Importado", statusDuplicate: "En propiedad", statusRejected: "Omitido", batchReadFailed: "No se pudo cargar el lote", metadataLookupFailed: "Error al buscar metadatos", noMetadataToLookup: "No hay metadatos pendientes", autoLookup: "Búsqueda automática", lookupAll: "Buscar todo", crossSourceLookupBook: "Búsqueda cross-source: {title}", lookupComplete: "Búsqueda completada", lookupFailures: "{count} búsquedas fallaron; se conservaron campos manuales", titleRequired: "El título es obligatorio", importFailed: "Error al importar", rejectFailed: "Error al omitir", refresh: "Actualizar", noSpines: "No se detectaron lomos", bookshelfPhotoAlt: "Foto de estantería", unnamed: "Sin título", titleField: "Título", authorField: "Autor", publisherField: "Editorial", descriptionField: "Descripción", useManualFields: "Usar campos manuales", lookupMetadata: "Buscar", importBook: "Importar", skip: "Omitir",
    bookReadFailed: "No se pudo cargar el libro", bookUpdateFailed: "No se pudo actualizar el libro", bookDeleteFailed: "No se pudo eliminar el libro", deleteConfirm: "¿Eliminar \"{title}\"?", bookNotFound: "Libro no encontrado", bookTitleRequired: "El título es obligatorio", fieldTitle: "Título", fieldAuthors: "Autores", fieldPublisher: "Editorial", fieldPublishedDate: "Fecha de publicación", fieldDescription: "Descripción", authorsLabel: "Autores", publishingLabel: "Publicación", sourceLabel: "Fuente", descriptionHeading: "Descripción", noDescription: "Sin descripción", manualSource: "Manual",
    settingsTitle: "Ajustes", settingsReadFailed: "No se pudieron cargar los ajustes", settingsSaveFailed: "No se pudieron guardar los ajustes", settingsSaved: "Ajustes guardados", settingsSummaryVision: "Vision actual", keyReady: "Key definida", keyNeeded: "Se necesita API key", languageSectionTitle: "Idioma de interfaz", uiLanguage: "Idioma", chooseLanguageHelp: "La interfaz usará este idioma. Los metadatos de libros no se traducen.", visionProviderTitle: "Elegir Vision provider", recommended: "Recomendado", openaiHelp: "Solo necesario al usar OpenAI Vision.", apiKeyTitle: "Obligatorio: API key de {provider}", googleBooksTitle: "Opcional: Google Books", googleBooksPlaceholder: "Puede estar vacío", advancedSettings: "Ajustes avanzados"
  },
  fr: {
    navLibrary: "Bibliothèque", navImport: "Importer", navSettings: "Réglages", loading: "Chargement", save: "Enregistrer", saving: "Enregistrement", back: "Retour", backToLibrary: "Retour à la bibliothèque", edit: "Modifier", cancel: "Annuler", delete: "Supprimer", useDefaults: "Utiliser les valeurs par défaut",
    libraryTitle: "Bibliothèque maison", importPhotos: "Importer des photos", searchLibraryPlaceholder: "Rechercher titre, auteur, ISBN, description", bookCount: "{count} livres", noBooks: "Aucun livre", libraryReadFailed: "Échec du chargement de la bibliothèque", authorUnknown: "Auteur inconnu", publishUnknown: "Infos de publication inconnues", isbnUnknown: "ISBN inconnu", owned: "Possédé", copyCount: "{count} exemplaires",
    importTitle: "Importer des photos d'étagère", imagesOnlyError: "Seules les images sont acceptées", noImagesSelected: "Aucune image sélectionnée", uploadFailed: "Échec de l'envoi", uploadImagesFirst: "Envoyer les images d'abord", prepareVision: "Préparation de l'analyse Vision", visionReading: "Vision lit les dos des livres", crossSourceLookup: "Recherche de métadonnées multi-sources", analysisComplete: "Analyse terminée, ouverture de la revue", visionFailed: "Échec de l'analyse Vision", dropImages: "Déposer des images d'étagère", chooseImages: "Choisir des images", previewTitle: "Aperçu des images", selectedImagesStats: "{count} fichiers · {kb} KB", noImages: "Aucune image", removeImage: "Retirer l'image", visionAnalyze: "Analyse Vision", analyzing: "Analyse",
    reviewTitle: "Confirmer l'import", statusPendingLookup: "Recherche en attente", statusNeedsReview: "À vérifier", statusConfirmed: "Importé", statusDuplicate: "Possédé", statusRejected: "Ignoré", batchReadFailed: "Échec du chargement du lot", metadataLookupFailed: "Échec de la recherche", noMetadataToLookup: "Aucune recherche à faire", autoLookup: "Recherche auto", lookupAll: "Tout rechercher", crossSourceLookupBook: "Recherche multi-sources : {title}", lookupComplete: "Recherche terminée", lookupFailures: "{count} recherches ont échoué ; les champs manuels sont conservés", titleRequired: "Le titre est obligatoire", importFailed: "Échec de l'import", rejectFailed: "Échec de l'omission", refresh: "Actualiser", noSpines: "Aucun dos détecté", bookshelfPhotoAlt: "Photo d'étagère", unnamed: "Sans titre", titleField: "Titre", authorField: "Auteur", publisherField: "Éditeur", descriptionField: "Description", useManualFields: "Utiliser les champs manuels", lookupMetadata: "Rechercher", importBook: "Importer", skip: "Ignorer",
    bookReadFailed: "Échec du chargement du livre", bookUpdateFailed: "Échec de la mise à jour", bookDeleteFailed: "Échec de la suppression", deleteConfirm: "Supprimer « {title} » ?", bookNotFound: "Livre introuvable", bookTitleRequired: "Le titre est obligatoire", fieldTitle: "Titre", fieldAuthors: "Auteurs", fieldPublisher: "Éditeur", fieldPublishedDate: "Date de publication", fieldDescription: "Description", authorsLabel: "Auteurs", publishingLabel: "Publication", sourceLabel: "Source", descriptionHeading: "Description", noDescription: "Aucune description", manualSource: "Manuel",
    settingsTitle: "Réglages", settingsReadFailed: "Échec du chargement des réglages", settingsSaveFailed: "Échec de l'enregistrement", settingsSaved: "Réglages enregistrés", settingsSummaryVision: "Vision actuel", keyReady: "Key définie", keyNeeded: "API key requise", languageSectionTitle: "Langue de l'interface", uiLanguage: "Langue", chooseLanguageHelp: "L'interface utilisera cette langue. Les métadonnées des livres ne sont pas traduites.", visionProviderTitle: "Choisir Vision provider", recommended: "Recommandé", openaiHelp: "Nécessaire uniquement avec OpenAI Vision.", apiKeyTitle: "Obligatoire : API key {provider}", googleBooksTitle: "Optionnel : Google Books", googleBooksPlaceholder: "Peut rester vide", advancedSettings: "Réglages avancés"
  },
  de: {
    navLibrary: "Bibliothek", navImport: "Import", navSettings: "Einstellungen", loading: "Laden", save: "Speichern", saving: "Speichern", back: "Zurück", backToLibrary: "Zur Bibliothek", edit: "Bearbeiten", cancel: "Abbrechen", delete: "Löschen", useDefaults: "Standardwerte verwenden",
    libraryTitle: "Heimbibliothek", importPhotos: "Fotos importieren", searchLibraryPlaceholder: "Titel, Autor, ISBN, Beschreibung suchen", bookCount: "{count} Bücher", noBooks: "Noch keine Bücher", libraryReadFailed: "Bibliothek konnte nicht geladen werden", authorUnknown: "Unbekannter Autor", publishUnknown: "Unbekannte Veröffentlichungsdaten", isbnUnknown: "Unbekannte ISBN", owned: "Vorhanden", copyCount: "{count} Exemplare",
    importTitle: "Regalfotos importieren", imagesOnlyError: "Nur Bilddateien können hinzugefügt werden", noImagesSelected: "Keine Bilder ausgewählt", uploadFailed: "Upload fehlgeschlagen", uploadImagesFirst: "Zuerst Bilder hochladen", prepareVision: "Vision-Analyse wird vorbereitet", visionReading: "Vision liest Buchrücken", crossSourceLookup: "Metadaten werden quellenübergreifend gesucht", analysisComplete: "Analyse abgeschlossen, Review wird geöffnet", visionFailed: "Vision-Analyse fehlgeschlagen", dropImages: "Regalbilder ablegen", chooseImages: "Bilder wählen", previewTitle: "Bildvorschau", selectedImagesStats: "{count} Dateien · {kb} KB", noImages: "Keine Bilder", removeImage: "Bild entfernen", visionAnalyze: "Vision-Analyse", analyzing: "Analyse",
    reviewTitle: "Import bestätigen", statusPendingLookup: "Suche ausstehend", statusNeedsReview: "Prüfen", statusConfirmed: "Importiert", statusDuplicate: "Vorhanden", statusRejected: "Übersprungen", batchReadFailed: "Batch konnte nicht geladen werden", metadataLookupFailed: "Metadatensuche fehlgeschlagen", noMetadataToLookup: "Keine Metadaten zu suchen", autoLookup: "Automatische Suche", lookupAll: "Alle suchen", crossSourceLookupBook: "Quellenübergreifende Suche: {title}", lookupComplete: "Metadatensuche abgeschlossen", lookupFailures: "{count} Suchen fehlgeschlagen; manuelle Felder behalten", titleRequired: "Titel ist erforderlich", importFailed: "Import fehlgeschlagen", rejectFailed: "Überspringen fehlgeschlagen", refresh: "Aktualisieren", noSpines: "Keine Buchrücken erkannt", bookshelfPhotoAlt: "Regalfoto", unnamed: "Ohne Titel", titleField: "Titel", authorField: "Autor", publisherField: "Verlag", descriptionField: "Beschreibung", useManualFields: "Manuelle Felder verwenden", lookupMetadata: "Suchen", importBook: "Importieren", skip: "Überspringen",
    bookReadFailed: "Buch konnte nicht geladen werden", bookUpdateFailed: "Buch konnte nicht aktualisiert werden", bookDeleteFailed: "Buch konnte nicht gelöscht werden", deleteConfirm: "\"{title}\" löschen?", bookNotFound: "Buch nicht gefunden", bookTitleRequired: "Titel ist erforderlich", fieldTitle: "Titel", fieldAuthors: "Autoren", fieldPublisher: "Verlag", fieldPublishedDate: "Veröffentlichungsdatum", fieldDescription: "Beschreibung", authorsLabel: "Autoren", publishingLabel: "Veröffentlichung", sourceLabel: "Quelle", descriptionHeading: "Beschreibung", noDescription: "Keine Beschreibung", manualSource: "Manuell",
    settingsTitle: "Einstellungen", settingsReadFailed: "Einstellungen konnten nicht geladen werden", settingsSaveFailed: "Einstellungen konnten nicht gespeichert werden", settingsSaved: "Einstellungen gespeichert", settingsSummaryVision: "Aktuelle Vision", keyReady: "Key gesetzt", keyNeeded: "API key erforderlich", languageSectionTitle: "Oberflächensprache", uiLanguage: "Sprache", chooseLanguageHelp: "Die Oberfläche verwendet diese Sprache. Buchmetadaten werden nicht übersetzt.", visionProviderTitle: "Vision provider wählen", recommended: "Empfohlen", openaiHelp: "Nur bei OpenAI Vision erforderlich.", apiKeyTitle: "Erforderlich: {provider} API key", googleBooksTitle: "Optional: Google Books", googleBooksPlaceholder: "Kann leer bleiben", advancedSettings: "Erweiterte Einstellungen"
  },
  pt: {
    navLibrary: "Biblioteca", navImport: "Importar", navSettings: "Configurações", loading: "Carregando", save: "Salvar", saving: "Salvando", back: "Voltar", backToLibrary: "Voltar à biblioteca", edit: "Editar", cancel: "Cancelar", delete: "Excluir", useDefaults: "Usar padrões",
    libraryTitle: "Biblioteca de casa", importPhotos: "Importar fotos", searchLibraryPlaceholder: "Buscar título, autor, ISBN, descrição", bookCount: "{count} livros", noBooks: "Ainda sem livros", libraryReadFailed: "Falha ao carregar biblioteca", authorUnknown: "Autor desconhecido", publishUnknown: "Dados de publicação desconhecidos", isbnUnknown: "ISBN desconhecido", owned: "Possuído", copyCount: "{count} cópias",
    importTitle: "Importar fotos da estante", imagesOnlyError: "Só é possível adicionar imagens", noImagesSelected: "Nenhuma imagem selecionada", uploadFailed: "Falha no upload", uploadImagesFirst: "Envie as imagens primeiro", prepareVision: "Preparando análise Vision", visionReading: "Vision está lendo lombadas", crossSourceLookup: "Buscando metadados em fontes", analysisComplete: "Análise concluída, abrindo revisão", visionFailed: "Falha na análise Vision", dropImages: "Solte imagens da estante", chooseImages: "Escolher imagens", previewTitle: "Prévia das imagens", selectedImagesStats: "{count} arquivos · {kb} KB", noImages: "Sem imagens", removeImage: "Remover imagem", visionAnalyze: "Análise Vision", analyzing: "Analisando",
    reviewTitle: "Confirmar importação", statusPendingLookup: "Busca pendente", statusNeedsReview: "Precisa revisão", statusConfirmed: "Importado", statusDuplicate: "Possuído", statusRejected: "Ignorado", batchReadFailed: "Falha ao carregar lote", metadataLookupFailed: "Falha ao buscar metadados", noMetadataToLookup: "Nenhum metadado para buscar", autoLookup: "Busca automática", lookupAll: "Buscar tudo", crossSourceLookupBook: "Busca cross-source: {title}", lookupComplete: "Busca concluída", lookupFailures: "{count} buscas falharam; campos manuais mantidos", titleRequired: "Título é obrigatório", importFailed: "Falha ao importar", rejectFailed: "Falha ao ignorar", refresh: "Atualizar", noSpines: "Nenhuma lombada detectada", bookshelfPhotoAlt: "Foto da estante", unnamed: "Sem título", titleField: "Título", authorField: "Autor", publisherField: "Editora", descriptionField: "Descrição", useManualFields: "Usar campos manuais", lookupMetadata: "Buscar", importBook: "Importar", skip: "Ignorar",
    bookReadFailed: "Falha ao carregar livro", bookUpdateFailed: "Falha ao atualizar livro", bookDeleteFailed: "Falha ao excluir livro", deleteConfirm: "Excluir \"{title}\"?", bookNotFound: "Livro não encontrado", bookTitleRequired: "Título é obrigatório", fieldTitle: "Título", fieldAuthors: "Autores", fieldPublisher: "Editora", fieldPublishedDate: "Data de publicação", fieldDescription: "Descrição", authorsLabel: "Autores", publishingLabel: "Publicação", sourceLabel: "Fonte", descriptionHeading: "Descrição", noDescription: "Sem descrição", manualSource: "Manual",
    settingsTitle: "Configurações", settingsReadFailed: "Falha ao carregar configurações", settingsSaveFailed: "Falha ao salvar configurações", settingsSaved: "Configurações salvas", settingsSummaryVision: "Vision atual", keyReady: "Key definida", keyNeeded: "API key necessária", languageSectionTitle: "Idioma da interface", uiLanguage: "Idioma", chooseLanguageHelp: "A interface usará este idioma. Os metadados dos livros não serão traduzidos.", visionProviderTitle: "Escolher Vision provider", recommended: "Recomendado", openaiHelp: "Necessário apenas com OpenAI Vision.", apiKeyTitle: "Obrigatório: API key de {provider}", googleBooksTitle: "Opcional: Google Books", googleBooksPlaceholder: "Pode ficar vazio", advancedSettings: "Configurações avançadas"
  },
  ar: {
    navLibrary: "المكتبة", navImport: "استيراد", navSettings: "الإعدادات", loading: "جار التحميل", save: "حفظ", saving: "جار الحفظ", back: "رجوع", backToLibrary: "العودة إلى المكتبة", edit: "تعديل", cancel: "إلغاء", delete: "حذف", useDefaults: "استخدام الافتراضي",
    libraryTitle: "مكتبة المنزل", importPhotos: "استيراد صور", searchLibraryPlaceholder: "ابحث بالعنوان أو المؤلف أو ISBN أو الوصف", bookCount: "{count} كتب", noBooks: "لا توجد كتب بعد", libraryReadFailed: "فشل تحميل المكتبة", authorUnknown: "المؤلف غير معروف", publishUnknown: "بيانات النشر غير معروفة", isbnUnknown: "ISBN غير معروف", owned: "مملوك", copyCount: "{count} نسخ",
    importTitle: "استيراد صور الرف", imagesOnlyError: "يمكن إضافة ملفات الصور فقط", noImagesSelected: "لم يتم اختيار صور", uploadFailed: "فشل الرفع", uploadImagesFirst: "ارفع الصور أولاً", prepareVision: "تحضير تحليل Vision", visionReading: "Vision يقرأ عناوين الكتب", crossSourceLookup: "جار البحث في المصادر", analysisComplete: "اكتمل التحليل، فتح المراجعة", visionFailed: "فشل تحليل Vision", dropImages: "أفلت صور الرف", chooseImages: "اختر الصور", previewTitle: "معاينة الصور", selectedImagesStats: "{count} ملفات · {kb} KB", noImages: "لا صور", removeImage: "إزالة الصورة", visionAnalyze: "تحليل Vision", analyzing: "جار التحليل",
    reviewTitle: "تأكيد الاستيراد", statusPendingLookup: "بانتظار البحث", statusNeedsReview: "يحتاج مراجعة", statusConfirmed: "تم الاستيراد", statusDuplicate: "مملوك", statusRejected: "تم التخطي", batchReadFailed: "فشل تحميل الدفعة", metadataLookupFailed: "فشل البحث عن البيانات", noMetadataToLookup: "لا توجد بيانات للبحث", autoLookup: "بحث تلقائي", lookupAll: "بحث الكل", crossSourceLookupBook: "بحث متعدد المصادر: {title}", lookupComplete: "اكتمل البحث", lookupFailures: "فشل {count} بحث؛ تم حفظ الحقول اليدوية", titleRequired: "العنوان مطلوب", importFailed: "فشل الاستيراد", rejectFailed: "فشل التخطي", refresh: "تحديث", noSpines: "لم يتم اكتشاف عناوين الكتب", bookshelfPhotoAlt: "صورة رف الكتب", unnamed: "بلا عنوان", titleField: "العنوان", authorField: "المؤلف", publisherField: "الناشر", descriptionField: "الوصف", useManualFields: "استخدام الحقول اليدوية", lookupMetadata: "بحث", importBook: "استيراد", skip: "تخطي",
    bookReadFailed: "فشل تحميل الكتاب", bookUpdateFailed: "فشل تحديث الكتاب", bookDeleteFailed: "فشل حذف الكتاب", deleteConfirm: "حذف \"{title}\"؟", bookNotFound: "الكتاب غير موجود", bookTitleRequired: "العنوان مطلوب", fieldTitle: "العنوان", fieldAuthors: "المؤلفون", fieldPublisher: "الناشر", fieldPublishedDate: "تاريخ النشر", fieldDescription: "الوصف", authorsLabel: "المؤلفون", publishingLabel: "النشر", sourceLabel: "المصدر", descriptionHeading: "الوصف", noDescription: "لا يوجد وصف", manualSource: "يدوي",
    settingsTitle: "الإعدادات", settingsReadFailed: "فشل تحميل الإعدادات", settingsSaveFailed: "فشل حفظ الإعدادات", settingsSaved: "تم حفظ الإعدادات", settingsSummaryVision: "Vision الحالي", keyReady: "تم ضبط key", keyNeeded: "API key مطلوب", languageSectionTitle: "لغة الواجهة", uiLanguage: "اللغة", chooseLanguageHelp: "ستستخدم الواجهة هذه اللغة. لن تتم ترجمة بيانات الكتب.", visionProviderTitle: "اختر Vision provider", recommended: "موصى به", openaiHelp: "مطلوب فقط عند استخدام OpenAI Vision.", apiKeyTitle: "مطلوب: API key لـ {provider}", googleBooksTitle: "اختياري: Google Books", googleBooksPlaceholder: "يمكن تركه فارغاً", advancedSettings: "إعدادات متقدمة"
  },
  hi: {
    navLibrary: "लाइब्रेरी", navImport: "आयात", navSettings: "सेटिंग्स", loading: "लोड हो रहा है", save: "सेव", saving: "सेव हो रहा है", back: "वापस", backToLibrary: "लाइब्रेरी पर वापस", edit: "संपादित", cancel: "रद्द", delete: "हटाएं", useDefaults: "डिफ़ॉल्ट उपयोग करें",
    libraryTitle: "घर की लाइब्रेरी", importPhotos: "फोटो आयात करें", searchLibraryPlaceholder: "शीर्षक, लेखक, ISBN, परिचय खोजें", bookCount: "{count} किताबें", noBooks: "अभी कोई किताब नहीं", libraryReadFailed: "लाइब्रेरी लोड नहीं हुई", authorUnknown: "लेखक अज्ञात", publishUnknown: "प्रकाशन जानकारी अज्ञात", isbnUnknown: "ISBN अज्ञात", owned: "स्वामित्व", copyCount: "{count} प्रतियां",
    importTitle: "बुकशेल्फ फोटो आयात करें", imagesOnlyError: "केवल image files जोड़े जा सकते हैं", noImagesSelected: "कोई image चयनित नहीं", uploadFailed: "अपलोड विफल", uploadImagesFirst: "पहले images अपलोड करें", prepareVision: "Vision analysis तैयार हो रहा है", visionReading: "Vision किताबों की spine पढ़ रहा है", crossSourceLookup: "स्रोतों से metadata खोज रहा है", analysisComplete: "Analysis पूर्ण, review खोल रहा है", visionFailed: "Vision analysis विफल", dropImages: "बुकशेल्फ images छोड़ें", chooseImages: "Images चुनें", previewTitle: "Image preview", selectedImagesStats: "{count} files · {kb} KB", noImages: "कोई image नहीं", removeImage: "Image हटाएं", visionAnalyze: "Vision analysis", analyzing: "Analysis हो रहा है",
    reviewTitle: "आयात पुष्टि", statusPendingLookup: "Lookup बाकी", statusNeedsReview: "Review चाहिए", statusConfirmed: "आयातित", statusDuplicate: "स्वामित्व", statusRejected: "छोड़ा गया", batchReadFailed: "Batch load विफल", metadataLookupFailed: "Metadata lookup विफल", noMetadataToLookup: "Lookup के लिए metadata नहीं", autoLookup: "Auto lookup", lookupAll: "सब lookup करें", crossSourceLookupBook: "Cross-source lookup: {title}", lookupComplete: "Metadata lookup पूर्ण", lookupFailures: "{count} lookups विफल; manual fields रखे गए", titleRequired: "शीर्षक आवश्यक है", importFailed: "आयात विफल", rejectFailed: "Skip विफल", refresh: "Refresh", noSpines: "कोई book spine नहीं मिला", bookshelfPhotoAlt: "बुकशेल्फ फोटो", unnamed: "बिना शीर्षक", titleField: "शीर्षक", authorField: "लेखक", publisherField: "प्रकाशक", descriptionField: "परिचय", useManualFields: "Manual fields उपयोग करें", lookupMetadata: "Lookup", importBook: "आयात", skip: "Skip",
    bookReadFailed: "किताब load विफल", bookUpdateFailed: "किताब update विफल", bookDeleteFailed: "किताब delete विफल", deleteConfirm: "\"{title}\" हटाएं?", bookNotFound: "किताब नहीं मिली", bookTitleRequired: "शीर्षक आवश्यक है", fieldTitle: "शीर्षक", fieldAuthors: "लेखक", fieldPublisher: "प्रकाशक", fieldPublishedDate: "प्रकाशन तारीख", fieldDescription: "परिचय", authorsLabel: "लेखक", publishingLabel: "प्रकाशन", sourceLabel: "स्रोत", descriptionHeading: "परिचय", noDescription: "परिचय नहीं", manualSource: "Manual",
    settingsTitle: "सेटिंग्स", settingsReadFailed: "सेटिंग्स load विफल", settingsSaveFailed: "सेटिंग्स save विफल", settingsSaved: "सेटिंग्स save हुई", settingsSummaryVision: "वर्तमान Vision", keyReady: "Key सेट", keyNeeded: "API key चाहिए", languageSectionTitle: "Interface भाषा", uiLanguage: "भाषा", chooseLanguageHelp: "पूरा interface इस भाषा में होगा। किताब metadata translate नहीं होगा।", visionProviderTitle: "Vision provider चुनें", recommended: "Recommended", openaiHelp: "केवल OpenAI Vision के लिए चाहिए।", apiKeyTitle: "Required: {provider} API key", googleBooksTitle: "Optional: Google Books", googleBooksPlaceholder: "खाली छोड़ सकते हैं", advancedSettings: "Advanced settings"
  }
};

export function translate(language: UiLanguage, key: I18nKey, variables: Record<string, string | number> = {}): string {
  const template = dictionaries[language][key] ?? dictionaries.en[key] ?? zhHant[key];
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, variableKey: string) => String(variables[variableKey] ?? match));
}
