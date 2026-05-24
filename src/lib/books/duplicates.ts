export interface BookIdentityInput {
  title: string;
  authors?: string[];
  isbn10?: string;
  isbn13?: string;
}

export function cleanIsbn(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const cleaned = value.replace(/[^0-9Xx]/g, "").toUpperCase();
  if (cleaned.length === 10 || (cleaned.length === 13 && /^97[89]/u.test(cleaned))) {
    return cleaned;
  }

  return "";
}

export function extractIsbn(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    if (!value) {
      continue;
    }

    const matches = value.match(/(?:97[89][-\s]?)?[0-9][0-9Xx\-\s]{8,17}[0-9Xx]/g) ?? [];
    for (const match of matches) {
      const isbn = cleanIsbn(match);
      if (isbn) {
        return isbn;
      }
    }
  }

  return "";
}

export function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeBookKey(title: string, authors: string[] = []): string {
  const normalizedTitle = normalizeText(title);
  const firstAuthor = normalizeText(authors.find(Boolean) ?? "");
  return `${normalizedTitle}::${firstAuthor}`;
}

export function identityKey(input: BookIdentityInput): string {
  const isbn13 = cleanIsbn(input.isbn13);
  if (isbn13) {
    return `isbn:${isbn13}`;
  }

  const isbn10 = cleanIsbn(input.isbn10);
  if (isbn10) {
    return `isbn:${isbn10}`;
  }

  return `text:${normalizeBookKey(input.title, input.authors ?? [])}`;
}

export function hasSameIdentity(left: BookIdentityInput, right: BookIdentityInput): boolean {
  const leftIsbn = cleanIsbn(left.isbn13) || cleanIsbn(left.isbn10);
  const rightIsbn = cleanIsbn(right.isbn13) || cleanIsbn(right.isbn10);
  if (leftIsbn && rightIsbn) {
    return leftIsbn === rightIsbn;
  }

  return normalizeBookKey(left.title, left.authors ?? []) === normalizeBookKey(right.title, right.authors ?? []);
}
