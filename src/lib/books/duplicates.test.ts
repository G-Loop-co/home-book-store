import { describe, expect, it } from "vitest";
import { cleanIsbn, hasSameIdentity, normalizeBookKey } from "@/lib/books/duplicates";

describe("duplicate helpers", () => {
  it("cleans ISBN values", () => {
    expect(cleanIsbn("978-0-553-80457-7")).toBe("9780553804577");
    expect(cleanIsbn("4717211035771")).toBe("");
    expect(cleanIsbn("bad")).toBe("");
  });

  it("normalizes title and first author into a stable key", () => {
    expect(normalizeBookKey("Slightly Out of Focus", ["Robert Capa"])).toBe("slightly out of focus::robert capa");
  });

  it("matches by ISBN before text identity", () => {
    expect(
      hasSameIdentity(
        { title: "A", authors: ["One"], isbn13: "9780553804577" },
        { title: "B", authors: ["Two"], isbn13: "978-0-553-80457-7" }
      )
    ).toBe(true);
  });
});
