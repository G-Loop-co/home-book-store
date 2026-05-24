import { normalizeText } from "@/lib/books/duplicates";
import type { MetadataCandidate, VisionBook } from "@/lib/types";

function comparableText(value: string): string {
  return normalizeText(value)
    .replace(/颶鼠/g, "鼹鼠")
    .replace(/鼴鼠/g, "鼹鼠")
    .replace(/與/g, "和")
    .replace(/馬/g, "马");
}

function tokenSet(value: string): Set<string> {
  return new Set(comparableText(value).split(" ").filter(Boolean));
}

function jaccard(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) {
      intersection += 1;
    }
  }

  return intersection / (left.size + right.size - intersection);
}

function uniqueValues(values: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const value of values.map((entry) => entry.trim()).filter(Boolean)) {
    const normalized = normalizeText(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    unique.push(value);
  }
  return unique;
}

function titleVariants(value: string): string[] {
  return uniqueValues([
    value,
    value.replace(/[（(][^）)]*(?:版|edition)[^）)]*[）)]/giu, "").trim(),
    value
      .replace(/(?:修訂版|增訂版|新版|典藏版|紀念版|限量版|平裝版|精裝版|二版|三版|第[一二三四五六七八九十0-9]+版)$/u, "")
      .trim()
  ]);
}

function isTitleNoise(value: string, input: VisionBook): boolean {
  const normalized = normalizeText(value);
  const normalizedAuthor = normalizeText(input.author);
  const normalizedPublisher = normalizeText(input.publisher);
  return (
    !normalized ||
    /^[（(]?.*版.*[）)]?$/u.test(value) ||
    /^[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,2}$/u.test(value) ||
    /(作者|出版社|出版|著|譯|译)$/u.test(value) ||
    (Boolean(normalizedAuthor) && normalized === normalizedAuthor) ||
    (Boolean(normalizedPublisher) && normalized === normalizedPublisher)
  );
}

function titleOptions(input: VisionBook): string[] {
  return uniqueValues([input.title, ...input.spineText.split(/\n+/u)])
    .filter((value) => !isTitleNoise(value, input))
    .flatMap(titleVariants);
}

export function titleSimilarity(left: string, right: string): number {
  const normalizedLeft = comparableText(left);
  const normalizedRight = comparableText(right);
  if (!normalizedLeft || !normalizedRight) {
    return 0;
  }

  if (normalizedLeft === normalizedRight) {
    return 1;
  }

  const compactLeft = normalizedLeft.replace(/\s+/g, "");
  const compactRight = normalizedRight.replace(/\s+/g, "");
  if (compactLeft === compactRight) {
    return 1;
  }

  if (
    compactLeft.length >= 4 &&
    compactRight.length >= 4 &&
    (normalizedLeft.includes(normalizedRight) ||
      normalizedRight.includes(normalizedLeft) ||
      compactLeft.includes(compactRight) ||
      compactRight.includes(compactLeft))
  ) {
    return 0.82;
  }

  return jaccard(tokenSet(normalizedLeft), tokenSet(normalizedRight));
}

export function scoreCandidate(input: VisionBook, candidate: Omit<MetadataCandidate, "score">): number {
  const candidateTitles = titleVariants(candidate.title);
  const titleScore = Math.max(
    ...titleOptions(input).flatMap((title) => candidateTitles.map((candidateTitle) => titleSimilarity(title, candidateTitle))),
    0
  );
  const authorText = candidate.authors.join(" ");
  const authorScore = input.author ? titleSimilarity(input.author, authorText) : titleSimilarity(input.spineText, authorText) * 0.45;
  const isbnBonus = input.isbn && (input.isbn === candidate.isbn10 || input.isbn === candidate.isbn13) ? 0.25 : 0;
  const publisherBonus = input.publisher && normalizeText(input.publisher) === normalizeText(candidate.publisher) ? 0.08 : 0;

  return Math.min(1, Number((titleScore * 0.72 + authorScore * 0.2 + isbnBonus + publisherBonus).toFixed(3)));
}
