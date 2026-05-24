import { cleanIsbn, extractIsbn, normalizeText } from "@/lib/books/duplicates";
import { getAppSettings } from "@/lib/db";
import { scoreCandidate } from "@/lib/metadata/scoring";
import type { MetadataCandidate, VisionBook } from "@/lib/types";

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asStringArray(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  return asArray(value).filter((item): item is string => typeof item === "string");
}

function firstValue(value: unknown): string {
  if (Array.isArray(value)) {
    return asString(value[0]);
  }
  return asString(value);
}

function lastValue(value: unknown): string {
  if (Array.isArray(value)) {
    return asString(value[value.length - 1]);
  }
  return asString(value);
}

async function getJson(url: string): Promise<JsonObject> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "HomeBookStore/0.1"
    },
    signal: AbortSignal.timeout(9000)
  });

  if (!response.ok) {
    throw new Error(`Metadata request failed: ${response.status}`);
  }

  return asObject(await response.json());
}

async function getJsonWithHeaders(url: string, headers: Record<string, string>): Promise<JsonObject> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "HomeBookStore/0.1",
      ...headers
    },
    signal: AbortSignal.timeout(9000)
  });

  if (!response.ok) {
    throw new Error(`Metadata request failed: ${response.status}`);
  }

  return asObject(await response.json());
}

async function getText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "Mozilla/5.0 HomeBookStore/0.1"
    },
    signal: AbortSignal.timeout(9000)
  });

  if (!response.ok) {
    throw new Error(`Metadata request failed: ${response.status}`);
  }

  return response.text();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function decodeHtml(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function candidateKey(candidate: Omit<MetadataCandidate, "score">): string {
  return [
    candidate.source,
    candidate.sourceId,
    cleanIsbn(candidate.isbn13) || cleanIsbn(candidate.isbn10) || normalizeText(candidate.title)
  ].join(":");
}

function normalizeCandidate(candidate: Omit<MetadataCandidate, "id" | "score">, input: VisionBook): MetadataCandidate {
  const candidateWithId = {
    ...candidate,
    id: candidateKey({ ...candidate, id: "" })
  };
  return {
    ...candidateWithId,
    score: scoreCandidate(input, candidateWithId)
  };
}

function normalizePublishedDate(value: string): string {
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.length >= 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  if (digits.length >= 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}`;
  }
  return value.trim();
}

function isbnFromText(value: string): string {
  return extractIsbn(value) || cleanIsbn(value);
}

function isbnPairFromText(value: string): { isbn10: string; isbn13: string } {
  const values = [value, ...value.split(/\s+/u)].map((entry) => isbnFromText(entry)).filter(Boolean);
  return {
    isbn10: values.find((entry) => entry.length === 10) ?? "",
    isbn13: values.find((entry) => entry.length === 13) ?? ""
  };
}

function openLibraryCover(coverId: number): string {
  return coverId > 0 ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : "";
}

function mapOpenLibraryDoc(doc: JsonObject, input: VisionBook): MetadataCandidate | null {
  const title = asString(doc.title);
  if (!title) {
    return null;
  }

  const isbnList = asStringArray(doc.isbn);
  const isbn13 = isbnList.find((isbn) => cleanIsbn(isbn).length === 13) ?? "";
  const isbn10 = isbnList.find((isbn) => cleanIsbn(isbn).length === 10) ?? "";
  const sourceId = asString(doc.key) || asStringArray(doc.edition_key)[0] || title;
  const publisher = asStringArray(doc.publisher)[0] ?? "";
  const firstPublishYear = asNumber(doc.first_publish_year);

  return normalizeCandidate(
    {
      title,
      authors: asStringArray(doc.author_name),
      publisher,
      publishedDate: firstPublishYear ? String(firstPublishYear) : "",
      isbn10: cleanIsbn(isbn10),
      isbn13: cleanIsbn(isbn13),
      coverUrl: openLibraryCover(asNumber(doc.cover_i)),
      description: "",
      source: "open_library",
      sourceId
    },
    input
  );
}

async function lookupOpenLibrary(input: VisionBook, isbn: string): Promise<MetadataCandidate[]> {
  const fields = "key,title,author_name,publisher,first_publish_year,isbn,cover_i,edition_key";
  const queries = isbn ? [{ isbn }] : searchQueries(input).map((query) => ({ q: query }));
  const results: MetadataCandidate[] = [];

  for (const query of queries.slice(0, 4)) {
    const params = new URLSearchParams({
      limit: "8",
      fields,
      ...query
    });

    const json = await getJson(`https://openlibrary.org/search.json?${params.toString()}`);
    results.push(...asArray(json.docs).map((doc) => mapOpenLibraryDoc(asObject(doc), input)).filter((doc): doc is MetadataCandidate => Boolean(doc)));
  }

  return results;
}

function mapGoogleVolume(item: JsonObject, input: VisionBook): MetadataCandidate | null {
  const id = asString(item.id);
  const volumeInfo = asObject(item.volumeInfo);
  const title = asString(volumeInfo.title);
  if (!title) {
    return null;
  }

  const identifiers = asArray(volumeInfo.industryIdentifiers).map(asObject);
  const isbn10 = identifiers.find((identifier) => asString(identifier.type) === "ISBN_10");
  const isbn13 = identifiers.find((identifier) => asString(identifier.type) === "ISBN_13");
  const imageLinks = asObject(volumeInfo.imageLinks);

  return normalizeCandidate(
    {
      title,
      authors: asStringArray(volumeInfo.authors),
      publisher: asString(volumeInfo.publisher),
      publishedDate: asString(volumeInfo.publishedDate),
      isbn10: cleanIsbn(asString(isbn10?.identifier)),
      isbn13: cleanIsbn(asString(isbn13?.identifier)),
      coverUrl: asString(imageLinks.thumbnail).replace("http://", "https://"),
      description: asString(volumeInfo.description),
      source: "google_books",
      sourceId: id
    },
    input
  );
}

async function lookupGoogleBooks(input: VisionBook, isbn: string): Promise<MetadataCandidate[]> {
  const key = getAppSettings().googleBooksApiKey;
  const queries = isbn ? [`isbn:${isbn}`] : searchQueries(input).map((query) => (input.author ? `${query} ${input.author}` : query));
  const results: MetadataCandidate[] = [];

  for (const query of queries.slice(0, 4)) {
    const params = new URLSearchParams({
      q: query,
      printType: "books",
      maxResults: "8"
    });
    if (key) {
      params.set("key", key);
    }

    const json = await getJson(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`);
    results.push(...asArray(json.items).map((item) => mapGoogleVolume(asObject(item), input)).filter((item): item is MetadataCandidate => Boolean(item)));
  }

  return results;
}

export function mapIsbnDbBook(book: JsonObject, input: VisionBook): MetadataCandidate | null {
  const title = asString(book.title_long) || asString(book.title);
  if (!title) {
    return null;
  }

  const isbn13 = cleanIsbn(asString(book.isbn13));
  const isbn10 = cleanIsbn(asString(book.isbn));
  const authors = asStringArray(book.authors);

  return normalizeCandidate(
    {
      title,
      authors: authors.length > 0 ? authors : splitContributorNames(asString(book.author)),
      publisher: asString(book.publisher),
      publishedDate: normalizePublishedDate(asString(book.date_published) || asString(book.publish_date)),
      isbn10: isbn10.length === 10 ? isbn10 : "",
      isbn13: isbn13.length === 13 ? isbn13 : "",
      coverUrl: asString(book.image).replace("http://", "https://"),
      description: asString(book.synopsis) || asString(book.synopsys) || asString(book.overview) || asString(book.excerpt),
      source: "isbn_db",
      sourceId: isbn13 || isbn10 || title
    },
    input
  );
}

async function lookupIsbnDb(input: VisionBook, isbn: string): Promise<MetadataCandidate[]> {
  const key = getAppSettings().isbndbApiKey;
  if (!key) {
    return [];
  }

  if (isbn) {
    const json = await getIsbnDbJson(`/book/${encodeURIComponent(isbn)}`, key);
    const candidate = mapIsbnDbBook(asObject(json.book), input);
    return candidate ? [candidate] : [];
  }

  const results: MetadataCandidate[] = [];
  for (const query of searchQueries(input).slice(0, 2)) {
    const params = new URLSearchParams({
      pageSize: "5",
      page: "1"
    });
    const json = await getIsbnDbJson(`/books/${encodeURIComponent(query)}?${params.toString()}`, key);
    results.push(...asArray(json.books).map((book) => mapIsbnDbBook(asObject(book), input)).filter((book): book is MetadataCandidate => Boolean(book)));
  }

  return results;
}

async function getIsbnDbJson(pathWithQuery: string, key: string): Promise<JsonObject> {
  const headers = {
    Authorization: key,
    "x-api-key": key
  };
  let lastError: unknown;

  for (const baseUrl of ["https://api.isbndb.com", "https://api2.isbndb.com"]) {
    try {
      return await getJsonWithHeaders(`${baseUrl}${pathWithQuery}`, headers);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("ISBNdb metadata request failed.");
}

export function mapNaverBookItem(item: JsonObject, input: VisionBook): MetadataCandidate | null {
  const title = decodeHtml(asString(item.title));
  if (!title) {
    return null;
  }

  const { isbn10, isbn13 } = isbnPairFromText(asString(item.isbn));

  return normalizeCandidate(
    {
      title,
      authors: splitContributorNames(decodeHtml(asString(item.author)).replace(/\^/g, ",").replace(/\|/g, ",")),
      publisher: decodeHtml(asString(item.publisher)),
      publishedDate: normalizePublishedDate(asString(item.pubdate)),
      isbn10,
      isbn13,
      coverUrl: asString(item.image).replace("http://", "https://"),
      description: decodeHtml(asString(item.description)),
      source: "naver_books",
      sourceId: asString(item.link) || isbn13 || isbn10 || title
    },
    input
  );
}

async function lookupNaverBooks(input: VisionBook, isbn: string): Promise<MetadataCandidate[]> {
  const { naverClientId, naverClientSecret } = getAppSettings();
  if (!naverClientId || !naverClientSecret) {
    return [];
  }

  const queries = isbn ? [isbn] : searchQueries(input).map((query) => (input.author ? `${query} ${input.author}` : query));
  const results: MetadataCandidate[] = [];

  for (const query of queries.slice(0, 3)) {
    const params = new URLSearchParams({
      query,
      display: "5",
      start: "1"
    });
    const json = await getJsonWithHeaders(`https://openapi.naver.com/v1/search/book.json?${params.toString()}`, {
      "X-Naver-Client-Id": naverClientId,
      "X-Naver-Client-Secret": naverClientSecret
    });
    results.push(...asArray(json.items).map((item) => mapNaverBookItem(asObject(item), input)).filter((item): item is MetadataCandidate => Boolean(item)));
  }

  return results;
}

export function mapRakutenBookItem(rawItem: JsonObject, input: VisionBook): MetadataCandidate | null {
  const item = Object.keys(asObject(rawItem.Item)).length > 0 ? asObject(rawItem.Item) : rawItem;
  const title = asString(item.title);
  if (!title) {
    return null;
  }

  const isbn = cleanIsbn(asString(item.isbn));

  return normalizeCandidate(
    {
      title,
      authors: splitContributorNames(asString(item.author)),
      publisher: asString(item.publisherName),
      publishedDate: normalizePublishedDate(asString(item.salesDate)),
      isbn10: isbn.length === 10 ? isbn : "",
      isbn13: isbn.length === 13 ? isbn : "",
      coverUrl: (asString(item.largeImageUrl) || asString(item.mediumImageUrl) || asString(item.smallImageUrl)).replace("http://", "https://"),
      description: asString(item.itemCaption),
      source: "rakuten_books",
      sourceId: asString(item.itemUrl) || isbn || title
    },
    input
  );
}

async function lookupRakutenBooks(input: VisionBook, isbn: string): Promise<MetadataCandidate[]> {
  const { rakutenApplicationId, rakutenAccessKey } = getAppSettings();
  if (!rakutenApplicationId || !rakutenAccessKey) {
    return [];
  }

  const baseParams = {
    applicationId: rakutenApplicationId,
    accessKey: rakutenAccessKey,
    format: "json",
    formatVersion: "2",
    hits: "5"
  };
  const requests = isbn
    ? [{ isbn }]
    : searchQueries(input)
        .slice(0, 2)
        .map((query) => ({
          title: query,
          ...(input.author ? { author: input.author } : {})
        }));
  const results: MetadataCandidate[] = [];

  for (const request of requests) {
    const params = new URLSearchParams({
      ...baseParams,
      ...request
    });
    const json = await getJson(`https://openapi.rakuten.co.jp/services/api/BooksBook/Search/20170404?${params.toString()}`);
    results.push(...asArray(json.Items).map((item) => mapRakutenBookItem(asObject(item), input)).filter((item): item is MetadataCandidate => Boolean(item)));
  }

  return results;
}

export function mapLibraryOfCongressResult(result: JsonObject, input: VisionBook): MetadataCandidate | null {
  const title = asString(result.title);
  if (!title) {
    return null;
  }

  const item = asObject(result.item);
  const isbn = cleanIsbn(asStringArray(result.isbn).join(" ") || extractIsbn(JSON.stringify(result)));
  const authors =
    asStringArray(result.contributor_names).length > 0
      ? asStringArray(result.contributor_names)
      : asArray(result.contributors).map(asObject).map((contributor) => asString(contributor.title)).filter(Boolean);
  const description = firstValue(result.description) || firstValue(item.description);
  const publisher = firstValue(result.publisher) || firstValue(item.publisher);
  const publishedDate = asString(result.date) || firstValue(item.date);
  const sourceId = asString(result.id) || asString(result.url) || title;

  return normalizeCandidate(
    {
      title,
      authors,
      publisher,
      publishedDate,
      isbn10: isbn.length === 10 ? isbn : "",
      isbn13: isbn.length === 13 ? isbn : "",
      coverUrl: lastValue(result.image_url).replace("http://", "https://"),
      description,
      source: "library_of_congress",
      sourceId
    },
    input
  );
}

async function lookupLibraryOfCongress(input: VisionBook, isbn: string): Promise<MetadataCandidate[]> {
  const queries = isbn ? [isbn] : searchQueries(input).map((query) => (input.author ? `${query} ${input.author}` : query));
  const results: MetadataCandidate[] = [];

  for (const query of queries.slice(0, 3)) {
    const params = new URLSearchParams({
      fo: "json",
      c: "5",
      q: query
    });
    const json = await getJson(`https://www.loc.gov/books/?${params.toString()}`);
    results.push(
      ...asArray(json.results)
        .map((result) => mapLibraryOfCongressResult(asObject(result), input))
        .filter((result): result is MetadataCandidate => Boolean(result))
    );
  }

  return results;
}

function hasCjk(value: string): boolean {
  return /\p{Script=Han}/u.test(value);
}

function compactCjkSpacing(value: string): string {
  return value
    .replace(/([\p{Script=Han}])[\s·・,，、:：-]+(?=[\p{Script=Han}])/gu, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function titleAfterDivider(value: string): string {
  if (!hasCjk(value)) {
    return "";
  }

  const parts = value.split(/[:：]/u).map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] ?? "" : "";
}

function queryVariants(value: string): string[] {
  return [
    value,
    value.replace(/颶鼠/g, "鼴鼠"),
    value.replace(/鼹鼠/g, "鼴鼠")
  ];
}

function isMetadataQueryNoise(value: string, input: VisionBook): boolean {
  const normalized = normalizeText(value);
  if (!normalized) {
    return true;
  }

  const normalizedAuthor = normalizeText(input.author);
  const normalizedPublisher = normalizeText(input.publisher);
  return (
    /^(?:[0-9０-９]+|第?[一二三四五六七八九十百千0-9０-９]+)$/u.test(value) ||
    /^[（(]?.*版.*[）)]?$/u.test(value) ||
    /^[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,2}$/u.test(value) ||
    /(作者|出版社|出版|著|譯|译)$/u.test(value) ||
    (Boolean(normalizedAuthor) && normalized === normalizedAuthor) ||
    (Boolean(normalizedPublisher) && normalized === normalizedPublisher)
  );
}

function spineLineQueries(input: VisionBook): string[] {
  const lines = input.spineText
    .split(/\n+/u)
    .map((line) => line.trim())
    .filter((line) => hasCjk(line))
    .filter((line) => !isMetadataQueryNoise(line, input));

  const queries: string[] = [];
  for (let start = 0; start < lines.length; start += 1) {
    for (let end = start + 1; end <= Math.min(lines.length, start + 4); end += 1) {
      const joined = compactCjkSpacing(lines.slice(start, end).join(""));
      if (joined.length >= 2 && joined.length <= 24) {
        queries.push(joined);
      }
    }
  }

  return queries;
}

export function searchQueries(input: VisionBook): string[] {
  const dividedTitle = titleAfterDivider(input.title);
  const values = [
    dividedTitle,
    compactCjkSpacing(dividedTitle),
    input.title,
    compactCjkSpacing(input.title),
    input.spineText,
    ...spineLineQueries(input),
    ...input.spineText.split(/\n+/u),
    input.title.replace(/[（(].*?[）)]/gu, "").trim()
  ];
  const seen = new Set<string>();

  return values
    .flatMap(queryVariants)
    .map((value) => value.trim())
    .filter((value) => value.length >= 2)
    .filter((value) => !isMetadataQueryNoise(value, input))
    .filter((value) => {
      const normalized = normalizeText(value);
      if (!normalized || seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
}

export function isbnTwProductUrls(searchHtml: string): string[] {
  const urls = new Set<string>();

  for (const match of searchHtml.matchAll(/href=["']([^"']*\/97[89][0-9Xx-]{10,17}[^"']*)["']/g)) {
    const href = decodeHtml(match[1] ?? "");
    const isbn = cleanIsbn(href);
    if (isbn.length === 10 || isbn.length === 13) {
      urls.add(`https://isbn.tw/${isbn}`);
    }
  }

  return Array.from(urls).slice(0, 5);
}

export function mapIsbnTwProduct(html: string, url: string, input: VisionBook): MetadataCandidate | null {
  const product = firstJsonLdByType(html, "Product");
  const title = asString(product.name) || firstMatch(html, /<title>([\s\S]*?)(?:-\s*978|\s*-\s*ISBN資料庫)/i);
  const isbn = cleanIsbn(asString(product.isbn) || asString(product.gtin13) || extractIsbn(html));
  if (!title || !isbn) {
    return null;
  }

  return normalizeCandidate(
    {
      title,
      authors: jsonLdNames(product.author),
      publisher: jsonLdNames(product.publisher)[0] ?? "",
      publishedDate: asString(product.datePublished),
      isbn10: isbn.length === 10 ? isbn : "",
      isbn13: isbn.length === 13 ? isbn : "",
      coverUrl: asString(product.image),
      description: metaContent(html, "description"),
      source: "isbn_tw",
      sourceId: asString(product.url) || url
    },
    input
  );
}

async function lookupIsbnTw(input: VisionBook, isbn: string): Promise<MetadataCandidate[]> {
  if (isbn) {
    const html = await getText(`https://isbn.tw/${isbn}`);
    const candidate = mapIsbnTwProduct(html, `https://isbn.tw/${isbn}`, input);
    return candidate ? [candidate] : [];
  }

  const productUrls = new Set<string>();
  for (const query of searchQueries(input).slice(0, 3)) {
    const params = new URLSearchParams({ query });
    const searchHtml = await getText(`https://isbn.tw/?${params.toString()}`).catch(() => "");
    for (const url of isbnTwProductUrls(searchHtml).slice(0, 3)) {
      productUrls.add(url);
    }
  }

  const results: MetadataCandidate[] = [];
  for (const url of Array.from(productUrls).slice(0, 5)) {
    const html = await getText(url).catch(() => "");
    const candidate = mapIsbnTwProduct(html, url, input);
    if (candidate) {
      results.push(candidate);
    }
  }

  return results;
}

export function mapOpenBdBook(book: JsonObject, input: VisionBook): MetadataCandidate | null {
  const summary = asObject(book.summary);
  const title = asString(summary.title);
  const isbn = cleanIsbn(asString(summary.isbn));
  if (!title || !isbn) {
    return null;
  }

  return normalizeCandidate(
    {
      title,
      authors: splitContributorNames(asString(summary.author)),
      publisher: asString(summary.publisher),
      publishedDate: normalizePublishedDate(asString(summary.pubdate)),
      isbn10: isbn.length === 10 ? isbn : "",
      isbn13: isbn.length === 13 ? isbn : "",
      coverUrl: asString(summary.cover).replace("http://", "https://"),
      description: "",
      source: "openbd",
      sourceId: isbn
    },
    input
  );
}

async function lookupOpenBd(input: VisionBook, isbn: string): Promise<MetadataCandidate[]> {
  if (!isbn) {
    return [];
  }

  const json = await fetch(`https://api.openbd.jp/v1/get?isbn=${encodeURIComponent(isbn)}`, {
    headers: {
      accept: "application/json",
      "user-agent": "HomeBookStore/0.1"
    },
    signal: AbortSignal.timeout(9000)
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Metadata request failed: ${response.status}`);
    }
    return response.json();
  }) as unknown;

  return asArray(json).map((entry) => mapOpenBdBook(asObject(entry), input)).filter((entry): entry is MetadataCandidate => Boolean(entry));
}

export function kingstoneProductUrls(searchHtml: string): string[] {
  const urls = new Set<string>();

  for (const match of searchHtml.matchAll(/href=["']([^"']*\/basic\/[0-9]+\/?[^"']*)["']/g)) {
    const href = decodeHtml(match[1] ?? "");
    if (href.includes("lid=home_keyword")) {
      continue;
    }
    const url = absoluteUrl(href, "https://www.kingstone.com.tw/");
    if (url) {
      urls.add(url);
    }
  }

  return Array.from(urls).slice(0, 5);
}

function kingstonePublication(description: string): { publisher: string; publishedDate: string } {
  const match = /(?:^|\|)\s*([^|]+?)\s+([0-9]{4}\/[0-9]{2}\/[0-9]{2})出版/u.exec(description);
  return {
    publisher: match?.[1]?.trim() ?? "",
    publishedDate: match?.[2]?.replaceAll("/", "-") ?? ""
  };
}

export function mapKingstoneProduct(html: string, url: string, input: VisionBook): MetadataCandidate | null {
  const description = metaContent(html, "description");
  const title =
    firstMatch(html, /<title>([\s\S]*?)(?:－金石堂|-金石堂|- 金石堂)<\/title>/i) ||
    metaContent(html, "og:title") ||
    input.title;
  const isbn = cleanIsbn(firstMatch(description, /ISBN:\s*([0-9Xx-]+)/i) || extractIsbn(description, html));
  if (!title || !isbn) {
    return null;
  }

  const publication = kingstonePublication(description);
  const authorText = firstMatch(description, /作者:\s*([^|]+)/u);

  return normalizeCandidate(
    {
      title,
      authors: splitContributorNames(authorText),
      publisher: publication.publisher,
      publishedDate: publication.publishedDate,
      isbn10: isbn.length === 10 ? isbn : "",
      isbn13: isbn.length === 13 ? isbn : "",
      coverUrl: metaContent(html, "og:image"),
      description,
      source: "kingstone",
      sourceId: url
    },
    input
  );
}

async function lookupKingstone(input: VisionBook, isbn: string): Promise<MetadataCandidate[]> {
  const queries = isbn ? [isbn] : searchQueries(input);
  const productUrls = new Set<string>();

  for (const query of queries.slice(0, 3)) {
    const searchHtml = await getText(`https://www.kingstone.com.tw/search/key/${encodeURIComponent(query)}`).catch(() => "");
    for (const url of kingstoneProductUrls(searchHtml).slice(0, 3)) {
      productUrls.add(url);
    }
  }

  const results: MetadataCandidate[] = [];
  for (const url of Array.from(productUrls).slice(0, 5)) {
    const html = await getText(url).catch(() => "");
    const candidate = mapKingstoneProduct(html, url, input);
    if (candidate) {
      results.push(candidate);
    }
  }

  return results;
}

function firstMatch(html: string, pattern: RegExp): string {
  return decodeHtml(pattern.exec(html)?.[1] ?? "");
}

function metaContent(html: string, property: string): string {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return firstMatch(
    html,
    new RegExp(`<meta\\s+(?:property|name)=["']${escaped}["']\\s+content=["']([^"']*)["'][^>]*>`, "i")
  );
}

function jsonLdObjects(html: string): JsonObject[] {
  const objects: JsonObject[] = [];

  for (const match of html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const rawJson = decodeHtmlEntities(match[1] ?? "").trim();
    if (!rawJson) {
      continue;
    }

    try {
      const parsed: unknown = JSON.parse(rawJson);
      const roots = Array.isArray(parsed) ? parsed : [parsed];
      for (const root of roots) {
        const object = asObject(root);
        if (Object.keys(object).length === 0) {
          continue;
        }
        objects.push(object);
        objects.push(...asArray(object["@graph"]).map(asObject).filter((entry) => Object.keys(entry).length > 0));
      }
    } catch {
      continue;
    }
  }

  return objects;
}

function schemaTypeMatches(value: unknown, type: string): boolean {
  const types = asStringArray(value).length > 0 ? asStringArray(value) : [asString(value)];
  return types.some((entry) => entry.toLowerCase() === type.toLowerCase());
}

function firstJsonLdByType(html: string, type: string): JsonObject {
  return jsonLdObjects(html).find((object) => schemaTypeMatches(object["@type"], type)) ?? {};
}

function jsonLdNames(value: unknown): string[] {
  if (typeof value === "string") {
    return [value].filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.flatMap(jsonLdNames);
  }

  const object = asObject(value);
  const name = asString(object.name);
  return name ? [name] : [];
}

function splitContributorNames(value: string): string[] {
  return value
    .replace(/\s*(?:著|作|譯|译|編|编)\s*$/u, "")
    .split(/[、,，;；/]+/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function absoluteUrl(href: string, baseUrl: string): string {
  try {
    return new URL(decodeHtml(href), baseUrl).toString().split("?")[0] ?? "";
  } catch {
    return "";
  }
}

function cqlQuoted(value: string): string {
  return `"${value.replace(/[\\"]/g, " ").trim()}"`;
}

function xmlRecords(xml: string): string[] {
  return Array.from(xml.matchAll(/<(?:[A-Za-z0-9_-]+:)?record\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z0-9_-]+:)?record>/g)).map(
    (match) => match[1] ?? ""
  );
}

function xmlFields(xml: string, tagName: string): string[] {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Array.from(
    xml.matchAll(new RegExp(`<(?:[A-Za-z0-9_-]+:)?${escaped}\\b[^>]*>([\\s\\S]*?)<\\/(?:[A-Za-z0-9_-]+:)?${escaped}>`, "gi"))
  )
    .map((match) => decodeHtml(match[1] ?? ""))
    .filter(Boolean);
}

function firstXmlField(xml: string, tagName: string): string {
  return xmlFields(xml, tagName)[0] ?? "";
}

function isbnFromValues(values: string[]): string {
  return cleanIsbn(values.map((value) => extractIsbn(value)).find(Boolean) ?? values.map(cleanIsbn).find((value) => value.length === 10 || value.length === 13) ?? "");
}

export function mapSruDcRecord(recordXml: string, source: "bnf" | "dnb", input: VisionBook): MetadataCandidate | null {
  const title = firstXmlField(recordXml, "title");
  if (!title) {
    return null;
  }

  const identifiers = xmlFields(recordXml, "identifier");
  const isbn = isbnFromValues(identifiers);
  const sourceId = identifiers.find((identifier) => !extractIsbn(identifier)) || identifiers[0] || title;

  return normalizeCandidate(
    {
      title,
      authors: xmlFields(recordXml, "creator").flatMap(splitContributorNames),
      publisher: firstXmlField(recordXml, "publisher"),
      publishedDate: normalizePublishedDate(firstXmlField(recordXml, "date")),
      isbn10: isbn.length === 10 ? isbn : "",
      isbn13: isbn.length === 13 ? isbn : "",
      coverUrl: "",
      description: firstXmlField(recordXml, "description"),
      source,
      sourceId
    },
    input
  );
}

async function lookupBnf(input: VisionBook, isbn: string): Promise<MetadataCandidate[]> {
  const queries = isbn
    ? [`bib.fuzzyISBN any ${cqlQuoted(isbn)}`]
    : searchQueries(input).slice(0, 2).map((query) => `bib.title all ${cqlQuoted(query)}`);
  const results: MetadataCandidate[] = [];

  for (const query of queries) {
    const params = new URLSearchParams({
      version: "1.2",
      operation: "searchRetrieve",
      recordSchema: "dublincore",
      maximumRecords: "5",
      query
    });
    const xml = await getText(`https://catalogue.bnf.fr/api/SRU?${params.toString()}`);
    results.push(...xmlRecords(xml).map((record) => mapSruDcRecord(record, "bnf", input)).filter((record): record is MetadataCandidate => Boolean(record)));
  }

  return results;
}

async function lookupDnb(input: VisionBook, isbn: string): Promise<MetadataCandidate[]> {
  const queries = isbn ? [`isbn=${cqlQuoted(isbn)}`] : searchQueries(input).slice(0, 2).map((query) => `tit=${cqlQuoted(query)}`);
  const results: MetadataCandidate[] = [];

  for (const query of queries) {
    const params = new URLSearchParams({
      version: "1.1",
      operation: "searchRetrieve",
      recordSchema: "DC",
      maximumRecords: "5",
      query
    });
    const xml = await getText(`https://services.dnb.de/sru/dnb?${params.toString()}`);
    results.push(...xmlRecords(xml).map((record) => mapSruDcRecord(record, "dnb", input)).filter((record): record is MetadataCandidate => Boolean(record)));
  }

  return results;
}

function hkbcField(html: string, field: string): string {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return firstMatch(
    html,
    new RegExp(`<dt[^>]*>${escaped}[^<]*<\\/dt>\\s*<dd[^>]*>([\\s\\S]*?)<\\/dd>`, "i")
  );
}

function mapHkBookCentreProduct(html: string, url: string, input: VisionBook): MetadataCandidate | null {
  const pageTitle = firstMatch(html, /<title>([\s\S]*?)<\/title>/i).replace(/\s*\(作者:.*?\)\s*$/u, "");
  const title = pageTitle || input.title;
  const isbn = cleanIsbn(hkbcField(html, "國際書號 ISBN:"));
  if (!title || !isbn) {
    return null;
  }

  return normalizeCandidate(
    {
      title,
      authors: [hkbcField(html, "作者 Author:")].filter(Boolean),
      publisher: hkbcField(html, "出版社 Publisher:"),
      publishedDate: hkbcField(html, "出版年份 Publication year:"),
      isbn10: cleanIsbn(isbn).length === 10 ? isbn : "",
      isbn13: cleanIsbn(isbn).length === 13 ? isbn : "",
      coverUrl: firstMatch(html, /<meta\s+property="og:image"\s+content="([^"]+)"/i),
      description: "",
      source: "hkbookcentre",
      sourceId: url
    },
    input
  );
}

interface DoubanSuggestItem {
  title?: string;
  url?: string;
  pic?: string;
  author_name?: string;
  year?: string;
  type?: string;
  id?: string;
}

function doubanField(html: string, field: string): string {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return firstMatch(html, new RegExp(`<span\\s+class=["']pl["']>\\s*${escaped}\\s*<\\/span>\\s*([\\s\\S]*?)<br`, "i"));
}

function doubanJsonLd(html: string): JsonObject {
  const json = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i.exec(html)?.[1] ?? "";
  if (!json.trim()) {
    return {};
  }

  try {
    return asObject(JSON.parse(json));
  } catch {
    return {};
  }
}

function mapDoubanSubject(html: string, fallback: DoubanSuggestItem, input: VisionBook): MetadataCandidate | null {
  const jsonLd = doubanJsonLd(html);
  const jsonAuthors = asArray(jsonLd.author).map(asObject).map((author) => asString(author.name)).filter(Boolean);
  const title = asString(jsonLd.name) || metaContent(html, "og:title") || asString(fallback.title);
  const isbn = cleanIsbn(asString(jsonLd.isbn) || metaContent(html, "book:isbn") || doubanField(html, "ISBN:"));
  if (!title) {
    return null;
  }

  return normalizeCandidate(
    {
      title,
      authors: jsonAuthors.length > 0 ? jsonAuthors : [asString(fallback.author_name)].filter(Boolean),
      publisher: doubanField(html, "出版社:"),
      publishedDate: doubanField(html, "出版年:") || asString(fallback.year),
      isbn10: isbn.length === 10 ? isbn : "",
      isbn13: isbn.length === 13 ? isbn : "",
      coverUrl: metaContent(html, "og:image") || asString(fallback.pic).replace("/s/", "/l/"),
      description: metaContent(html, "og:description"),
      source: "douban",
      sourceId: asString(fallback.id) || asString(fallback.url)
    },
    input
  );
}

async function lookupDouban(input: VisionBook, isbn: string): Promise<MetadataCandidate[]> {
  if (isbn) {
    return [];
  }

  const suggestions = new Map<string, DoubanSuggestItem>();
  for (const query of searchQueries(input).slice(0, 5)) {
    const params = new URLSearchParams({ q: query });
    const json = (await fetch(`https://book.douban.com/j/subject_suggest?${params.toString()}`, {
      headers: {
        accept: "application/json",
        referer: "https://book.douban.com/",
        "user-agent": "Mozilla/5.0 HomeBookStore/0.1"
      },
      signal: AbortSignal.timeout(9000)
    }).then((response) => {
      if (!response.ok) {
        throw new Error(`Metadata request failed: ${response.status}`);
      }
      return response.json();
    })) as unknown;

    for (const item of asArray(json).map(asObject).slice(0, 3)) {
      if (asString(item.type) !== "b") {
        continue;
      }
      const url = asString(item.url);
      if (url) {
        suggestions.set(url, item as DoubanSuggestItem);
      }
    }
  }

  const results: MetadataCandidate[] = [];
  for (const suggestion of Array.from(suggestions.values()).slice(0, 5)) {
    const url = asString(suggestion.url);
    const html = await getText(url);
    const candidate = mapDoubanSubject(html, suggestion, input);
    if (candidate) {
      results.push(candidate);
    }
  }

  return results;
}

function hkbcProductUrls(searchHtml: string): string[] {
  const urls = new Set<string>();
  for (const match of searchHtml.matchAll(/href="([^"]+)"/g)) {
    const href = decodeHtml(match[1] ?? "");
    if (!href.includes("hkbookcentre.uk/") || href.includes("search.php") || href.includes("compare")) {
      continue;
    }
    const url = href.split("?")[0];
    if (/\/[^/]+\/[^/]+\/$/u.test(url)) {
      urls.add(url);
    }
  }

  return Array.from(urls).slice(0, 3);
}

async function lookupHkBookCentre(input: VisionBook, isbn: string): Promise<MetadataCandidate[]> {
  if (isbn) {
    return [];
  }

  const results: MetadataCandidate[] = [];
  for (const query of searchQueries(input).slice(0, 2)) {
    const params = new URLSearchParams({ search_query: query });
    const searchHtml = await getText(`https://hkbookcentre.uk/search.php?${params.toString()}`);

    for (const url of hkbcProductUrls(searchHtml)) {
      const productHtml = await getText(url);
      const candidate = mapHkBookCentreProduct(productHtml, url, input);
      if (candidate) {
        results.push(candidate);
      }
    }
  }

  return results;
}

function mapInternetArchiveDoc(doc: JsonObject, input: VisionBook): MetadataCandidate | null {
  const title = asString(doc.title);
  const identifier = asString(doc.identifier);
  if (!title || !identifier) {
    return null;
  }

  const isbnList = asStringArray(doc.isbn);
  const isbn13 = isbnList.find((isbn) => cleanIsbn(isbn).length === 13) ?? "";
  const isbn10 = isbnList.find((isbn) => cleanIsbn(isbn).length === 10) ?? "";
  if (!cleanIsbn(isbn13) && !cleanIsbn(isbn10)) {
    return null;
  }

  return normalizeCandidate(
    {
      title,
      authors: [firstValue(doc.creator)].filter(Boolean),
      publisher: firstValue(doc.publisher),
      publishedDate: firstValue(doc.date).slice(0, 10),
      isbn10: cleanIsbn(isbn10),
      isbn13: cleanIsbn(isbn13),
      coverUrl: asString(doc.coverurl) || `https://archive.org/services/img/${identifier}`,
      description: asStringArray(doc.description).join(" "),
      source: "internet_archive",
      sourceId: identifier
    },
    input
  );
}

async function lookupInternetArchive(input: VisionBook, isbn: string): Promise<MetadataCandidate[]> {
  const queries = isbn ? [`isbn:${isbn}`] : searchQueries(input).map((query) => `title:(${query})`);
  const results: MetadataCandidate[] = [];

  for (const query of queries.slice(0, 5)) {
    const params = new URLSearchParams({
      q: `${query} AND mediatype:texts`,
      output: "json",
      rows: "5",
      page: "1"
    });
    for (const field of ["identifier", "title", "creator", "date", "publisher", "isbn", "description", "coverurl"]) {
      params.append("fl[]", field);
    }

    const json = await getJson(`https://archive.org/advancedsearch.php?${params.toString()}`);
    const response = asObject(json.response);
    results.push(...asArray(response.docs).map((doc) => mapInternetArchiveDoc(asObject(doc), input)).filter((doc): doc is MetadataCandidate => Boolean(doc)));
  }

  return results;
}

function dedupeCandidates(candidates: MetadataCandidate[]): MetadataCandidate[] {
  const byKey = new Map<string, MetadataCandidate>();

  for (const candidate of candidates.filter((entry) => entry.score >= 0.2)) {
    const identity = cleanIsbn(candidate.isbn13) || cleanIsbn(candidate.isbn10) || normalizeText(`${candidate.title} ${candidate.authors[0] ?? ""}`);
    const key = `${candidate.source}:${identity}`;
    const existing = byKey.get(key);
    if (!existing || shouldReplaceCandidate(existing, candidate)) {
      byKey.set(key, candidate);
    }
  }

  return Array.from(byKey.values()).sort((left, right) => right.score - left.score).slice(0, 12);
}

function candidateCompleteness(candidate: MetadataCandidate): number {
  return [
    candidate.title,
    candidate.authors[0] ?? "",
    candidate.publisher,
    candidate.publishedDate,
    candidate.isbn13 || candidate.isbn10,
    candidate.coverUrl,
    candidate.description
  ].filter(Boolean).length;
}

function shouldReplaceCandidate(existing: MetadataCandidate, candidate: MetadataCandidate): boolean {
  if (candidate.score > existing.score + 0.05) {
    return true;
  }

  if (candidate.score + 0.05 < existing.score) {
    return false;
  }

  return candidateCompleteness(candidate) > candidateCompleteness(existing);
}

export async function lookupBookMetadata(input: VisionBook): Promise<MetadataCandidate[]> {
  const isbn = cleanIsbn(input.isbn) || extractIsbn(input.spineText, input.title);
  const sources = [
    { name: "open_library", lookup: lookupOpenLibrary },
    { name: "google_books", lookup: lookupGoogleBooks },
    { name: "isbn_db", lookup: lookupIsbnDb },
    { name: "naver_books", lookup: lookupNaverBooks },
    { name: "rakuten_books", lookup: lookupRakutenBooks },
    { name: "library_of_congress", lookup: lookupLibraryOfCongress },
    { name: "isbn_tw", lookup: lookupIsbnTw },
    { name: "kingstone", lookup: lookupKingstone },
    { name: "hkbookcentre", lookup: lookupHkBookCentre },
    { name: "douban", lookup: lookupDouban },
    { name: "openbd", lookup: lookupOpenBd },
    { name: "bnf", lookup: lookupBnf },
    { name: "dnb", lookup: lookupDnb },
    { name: "internet_archive", lookup: lookupInternetArchive }
  ];
  const results = await Promise.allSettled(
    sources.map(async (source) => ({
      source: source.name,
      candidates: await source.lookup(input, isbn)
    }))
  );
  const candidates = results.flatMap((result) => {
    if (result.status === "fulfilled") {
      return result.value.candidates;
    }

    return [];
  });
  return dedupeCandidates(candidates);
}
